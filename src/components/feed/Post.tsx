
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

const Post: React.FC<PostProps> = ({
  id,
  author,
  content,
  images,
  timestamp,
  likes,
  comments,
  hasLiked = false,
}) => {
  const [liked, setLiked] = useState(hasLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    if (liked) {
      setLikeCount((prev) => prev - 1);
    } else {
      setLikeCount((prev) => prev + 1);
    }
    setLiked(!liked);
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
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-medium">{author.name}</span>
              {author.verified && (
                <CheckCircle className="h-4 w-4 text-primary fill-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">@{author.username}</span>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <p className="whitespace-pre-line mb-3">{content}</p>
          
          {images && images.length > 0 && (
            <div className={cn(
              "rounded-xl overflow-hidden mt-2",
              images.length > 1 ? "grid grid-cols-2 gap-1" : ""
            )}>
              {images.map((img, i) => (
                <motion.img
                  key={i}
                  src={img}
                  alt={`Post image ${i+1}`}
                  className={cn(
                    "w-full object-cover",
                    images.length === 1 ? "max-h-[400px]" : "h-40"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * i }}
                />
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
            >
              <Heart className={cn("h-4 w-4", liked ? "fill-rose-500" : "")} />
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
            
            <Button variant="ghost" size="sm" className="flex items-center gap-2 rounded-full">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
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
                <div className="text-sm text-center text-muted-foreground">
                  Comments will appear here
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default Post;
