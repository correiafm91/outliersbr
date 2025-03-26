
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getUserCommentLikes, createNotification } from '@/integrations/supabase/functions';

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
  refreshComments?: boolean;
}

const CommentList: React.FC<CommentListProps> = ({ postId, refreshComments }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh comments when props change
  useEffect(() => {
    if (refreshComments) {
      setRefreshKey(prev => prev + 1);
    }
  }, [refreshComments]);

  useEffect(() => {
    fetchComments();
  }, [postId, refreshKey]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      // First get the comments with profile data
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (commentsError) throw commentsError;
      
      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setIsLoading(false);
        return;
      }
      
      // Extract comment IDs for batch operations
      const commentIds = commentsData.map(comment => comment.id);
      
      // Get likes count for all comments in one batch operation
      const likesCountsPromise = Promise.all(
        commentIds.map(async (commentId) => {
          const { count, error } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', commentId);
            
          return error ? 0 : (count || 0);
        })
      );
      
      // If user is logged in, get their likes in one batch operation
      const userLikesPromise = user 
        ? getUserCommentLikes(user.id, commentIds)
        : Promise.resolve([]);
      
      // Wait for both promises to resolve
      const [likesCounts, userLikedCommentIds] = await Promise.all([
        likesCountsPromise,
        userLikesPromise
      ]);
      
      // Map the data into the required format
      const formattedComments = commentsData.map((comment, index) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user: {
          id: comment.user_id,
          username: (comment.profiles as any).username,
          avatar_url: (comment.profiles as any).avatar_url,
        },
        likes_count: likesCounts[index],
        has_liked: user ? userLikedCommentIds.includes(comment.id) : false
      }));
      
      setComments(formattedComments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      setLoadError(error.message);
      toast.error('Erro ao carregar comentários', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean, authorId: string) => {
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
          .eq('user_id', user.id)
          .eq('comment_id', commentId);
          
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
          .insert({ 
            user_id: user.id,
            comment_id: commentId
          });
          
        if (error) throw error;
        
        // Create notification for the comment author
        if (authorId !== user.id) {
          await createNotification(
            'comment_like',
            authorId,
            user.id,
            postId,
            commentId
          );
        }
        
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

  const navigateToProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Erro ao carregar comentários.</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="mt-2"
        >
          Tentar novamente
        </Button>
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

  return (
    <div className="space-y-4 mt-4">
      {comments.map(comment => (
        <div key={comment.id} className="border-t pt-4">
          <div className="flex gap-3">
            <div className="cursor-pointer" onClick={() => navigateToProfile(comment.user.username)}>
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={comment.user.avatar_url || undefined} 
                  alt={comment.user.username} 
                  className="object-cover" 
                />
                <AvatarFallback>{comment.user.username[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div 
                  className="font-medium text-sm hover:underline cursor-pointer"
                  onClick={() => navigateToProfile(comment.user.username)}
                >
                  @{comment.user.username}
                </div>
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
                  onClick={() => handleLikeComment(comment.id, comment.has_liked, comment.user.id)}
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
