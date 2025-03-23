
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MessageSquare, ThumbsUp, Clock, CheckCircle } from 'lucide-react';
import CommentForm from './CommentForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  replies?: Comment[];
}

interface CommentListProps {
  postId: string;
}

const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      
      // Get all comments for this post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });
      
      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setIsLoading(false);
        return;
      }
      
      // Get all user IDs from comments to fetch their profiles
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map of user_id to profile for quick lookup
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Combine comments with profile data
      const processedComments = commentsData.map(comment => {
        const profile = profilesMap[comment.user_id] || {
          username: 'usuário',
          avatar_url: null,
          full_name: null
        };
        
        return {
          ...comment,
          profiles: {
            username: profile.username,
            avatar_url: profile.avatar_url,
            full_name: profile.full_name
          }
        } as Comment;
      });
      
      setComments(processedComments);
    } catch (error: any) {
      toast.error('Erro ao carregar comentários', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentAdded = () => {
    setRefreshKey(prev => prev + 1);
    setShowCommentForm(false);
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    setShowCommentForm(true);
  };

  useEffect(() => {
    fetchComments();
  }, [postId, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center p-4">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhum comentário ainda</p>
        <Button 
          variant="outline" 
          className="mt-2" 
          size="sm"
          onClick={() => setShowCommentForm(!showCommentForm)}
        >
          Adicionar o primeiro comentário
        </Button>
        {showCommentForm && (
          <div className="mt-4">
            <CommentForm 
              postId={postId} 
              onCommentAdded={handleCommentAdded}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 my-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Comentários ({comments.length})</h3>
        {!showCommentForm && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowCommentForm(true)}
          >
            Adicionar comentário
          </Button>
        )}
      </div>
      
      {showCommentForm && !replyingTo && (
        <CommentForm 
          postId={postId} 
          onCommentAdded={handleCommentAdded}
        />
      )}
      
      {comments.map((comment, index) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="border border-border p-4 rounded-lg"
        >
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={comment.profiles.avatar_url || undefined} 
                alt={comment.profiles.username} 
              />
              <AvatarFallback>
                {comment.profiles.username ? comment.profiles.username[0].toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {comment.profiles.full_name || comment.profiles.username}
                </span>
                {comment.profiles.username.toLowerCase() === 'outliersofc' && (
                  <Badge variant="outline" className="px-1 bg-primary text-primary-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Oficial
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(comment.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <p className="mt-1 text-sm">{comment.content}</p>
              
              <div className="flex gap-3 mt-2">
                <button className="text-xs text-muted-foreground flex items-center">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Curtir
                </button>
                <button 
                  className="text-xs text-muted-foreground flex items-center"
                  onClick={() => handleReply(comment.id)}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Responder
                </button>
              </div>
              
              {replyingTo === comment.id && (
                <div className="mt-3">
                  <CommentForm 
                    postId={postId} 
                    parentId={comment.id}
                    onCommentAdded={handleCommentAdded}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CommentList;
