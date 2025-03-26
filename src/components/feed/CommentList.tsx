
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CommentProps {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  likes_count: number;
  has_liked: boolean;
}

interface CommentListProps {
  postId: string;
}

const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          profiles:user_id (
            id,
            username,
            avatar_url
          ),
          likes_count:comment_likes(count)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      let commentsData = data.map(item => ({
        id: item.id,
        content: item.content,
        created_at: item.created_at,
        user: {
          id: (item.profiles as any).id,
          username: (item.profiles as any).username,
          avatar_url: (item.profiles as any).avatar_url,
        },
        likes_count: (item.likes_count as any) || 0,
        has_liked: false
      }));
      
      // If user is logged in, check which comments they've liked
      if (user) {
        const { data: userLikes, error: likesError } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id);
          
        if (!likesError && userLikes) {
          const likedCommentIds = userLikes.map(like => like.comment_id);
          
          commentsData = commentsData.map(comment => ({
            ...comment,
            has_liked: likedCommentIds.includes(comment.id)
          }));
        }
      }
      
      setComments(commentsData);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast.error('Erro ao carregar comentários', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      toast.error('É necessário fazer login para curtir comentários');
      return;
    }
    
    try {
      setLikeLoadingId(commentId);
      
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .match({ user_id: user.id, comment_id: commentId });
          
        if (error) throw error;
        
        // Update local state
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, has_liked: false, likes_count: Math.max(0, comment.likes_count - 1) }
            : comment
        ));
      } else {
        // Add like
        const { error } = await supabase
          .from('comment_likes')
          .insert({ user_id: user.id, comment_id: commentId });
          
        if (error) throw error;
        
        // Update local state
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, has_liked: true, likes_count: comment.likes_count + 1 }
            : comment
        ));
      }
    } catch (error: any) {
      console.error('Error liking comment:', error);
      toast.error('Erro ao curtir comentário', {
        description: error.message
      });
    } finally {
      setLikeLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Ainda não há comentários. Seja o primeiro a comentar!
      </div>
    );
  }

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to highlight mentions in comment text
  const formatCommentText = (text: string) => {
    // Replace @username with links
    const parts = text.split(/(@\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        return (
          <Link 
            key={index} 
            to={`/profile/${username}`} 
            className="text-primary hover:underline"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4 mt-4">
      {comments.map(comment => (
        <div key={comment.id} className="border-t pt-4">
          <div className="flex gap-3">
            <Link to={`/profile/${comment.user.username}`} className="block">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user.avatar_url || undefined} alt={comment.user.username} />
                <AvatarFallback>{comment.user.username[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link to={`/profile/${comment.user.username}`} className="font-medium text-sm hover:underline">
                  @{comment.user.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatCommentDate(comment.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm whitespace-pre-line">
                {formatCommentText(comment.content)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 text-xs rounded-full",
                    comment.has_liked ? "text-rose-500" : "text-muted-foreground"
                  )}
                  onClick={() => handleLikeComment(comment.id, comment.has_liked)}
                  disabled={likeLoadingId === comment.id}
                >
                  {likeLoadingId === comment.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Heart className={cn("h-3 w-3 mr-1", comment.has_liked ? "fill-rose-500" : "")} />
                  )}
                  <span>{comment.likes_count}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
