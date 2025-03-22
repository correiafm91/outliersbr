
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

interface CommentListProps {
  postId: string;
}

const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            profiles:user_id(username, avatar_url, full_name)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        setComments(data || []);
      } catch (error: any) {
        console.error('Error fetching comments:', error);
        toast.error('Erro ao carregar comentários', {
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComments();
    
    // Set up a realtime subscription for new comments
    const subscription = supabase
      .channel('public:comments')
      .on('INSERT', payload => {
        if (payload.new && payload.new.post_id === postId) {
          // Fetch the full comment with profile data
          const fetchNewComment = async () => {
            const { data, error } = await supabase
              .from('comments')
              .select(`
                id,
                content,
                created_at,
                profiles:user_id(username, avatar_url, full_name)
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (!error && data) {
              setComments(prev => [...prev, data]);
            }
          };
          
          fetchNewComment();
        }
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [postId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Sem comentários ainda. Seja o primeiro a comentar!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, index) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex gap-3"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profiles.avatar_url || undefined} alt={comment.profiles.username} />
            <AvatarFallback>
              {comment.profiles.username ? comment.profiles.username[0].toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm text-foreground">
                {comment.profiles.full_name || comment.profiles.username}
              </span>
              {comment.profiles.username.toLowerCase() === 'outliersofc' && (
                <CheckCircle className="h-3 w-3 text-primary fill-primary" />
              )}
              <span className="text-xs text-muted-foreground ml-1">
                • {new Date(comment.created_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-sm mt-1 text-foreground">{comment.content}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CommentList;
