
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, CheckCircle, Link2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommentList from './CommentList';
import CommentForm from './CommentForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostProps {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
    verified?: boolean;
  };
  content: string;
  images?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  hasLiked?: boolean;
  onRefresh?: () => void;
}

const Post: React.FC<PostProps> = ({
  id,
  author,
  content,
  images = [],
  timestamp,
  likes,
  comments,
  hasLiked = false,
  onRefresh,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(hasLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [showComments, setShowComments] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast.error('É necessário fazer login para curtir publicações');
      return;
    }

    try {
      setIsLikeLoading(true);
      
      if (liked) {
        // Remove like
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ user_id: user.id, post_id: id });
        
        if (error) throw error;
        
        setLikeCount((prev) => prev - 1);
        setLiked(false);
      } else {
        // Add like
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: id });
        
        if (error) throw error;
        
        setLikeCount((prev) => prev + 1);
        setLiked(true);
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Erro ao curtir publicação', {
        description: error.message,
      });
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsShareLoading(true);
      // Create a shareable URL
      const url = `${window.location.origin}/post/${id}`;
      
      // Try to use the Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Publicação de ${author.name}`,
          text: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          url: url,
        });
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado para a área de transferência!');
      }
    } catch (error: any) {
      console.error('Error sharing post:', error);
      // If the user cancelled the share, don't show an error
      if (error.name !== 'AbortError') {
        toast.error('Erro ao compartilhar', {
          description: error.message,
        });
      }
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      setIsShareLoading(true);
      // Create a shareable URL for the profile
      const url = `${window.location.origin}/profile/${author.username}`;
      
      // Try to use the Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Perfil de ${author.name}`,
          text: `Confira o perfil de ${author.name} na Outliers!`,
          url: url,
        });
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(url);
        toast.success('Link do perfil copiado para a área de transferência!');
      }
    } catch (error: any) {
      console.error('Error sharing profile:', error);
      // If the user cancelled the share, don't show an error
      if (error.name !== 'AbortError') {
        toast.error('Erro ao compartilhar perfil', {
          description: error.message,
        });
      }
    } finally {
      setIsShareLoading(false);
    }
  };

  const navigateToProfile = () => {
    navigate(`/profile/${author.username}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full mb-4"
    >
      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 p-4">
          <Avatar className="h-10 w-10 cursor-pointer" onClick={navigateToProfile}>
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col cursor-pointer" onClick={navigateToProfile}>
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">{author.name}</span>
              {author.verified && (
                <CheckCircle className="h-4 w-4 text-primary fill-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">@{author.username}</span>
          </div>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareProfile}>
                  <Link2 className="mr-2 h-4 w-4" />
                  <span>Compartilhar perfil</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <p className="whitespace-pre-line mb-3 text-foreground">{content}</p>
          
          {images && images.length > 0 && (
            <div className={cn(
              "rounded-xl overflow-hidden mt-2",
              images.length > 1 ? "grid grid-cols-2 gap-1" : ""
            )}>
              {images.map((img, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "overflow-hidden",
                    images.length === 1 ? "max-h-[400px]" : "h-40"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * i }}
                >
                  {img.includes('.mp4') || img.includes('.webm') || img.includes('.mov') ? (
                    <video 
                      src={img} 
                      controls 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={img}
                      alt={`Post image ${i+1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-3">
            {timestamp}
          </div>
        </CardContent>

        <CardFooter className="p-2 border-t">
          <div className="flex items-center justify-around w-full">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "flex items-center gap-2 rounded-full", 
                liked ? "text-rose-500" : ""
              )}
              onClick={handleLike}
              disabled={isLikeLoading}
            >
              {isLikeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={cn("h-4 w-4", liked ? "fill-rose-500" : "")} />
              )}
              <span>{likeCount}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 rounded-full"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{comments}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 rounded-full"
              onClick={handleShare}
              disabled={isShareLoading}
            >
              {isShareLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span>Compartilhar</span>
            </Button>
          </div>
        </CardFooter>
        
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t"
            >
              <div className="p-4">
                <CommentForm postId={id} onCommentAdded={onRefresh} />
                <CommentList postId={id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default Post;
