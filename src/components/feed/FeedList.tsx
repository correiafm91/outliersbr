
import React, { useState, useEffect } from 'react';
import Post from './Post';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getPostsWithProfiles, getUserLikedPostIds } from '@/integrations/supabase/functions';

interface PostType {
  id: string;
  content: string;
  images: string[] | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  likes: number;
  comments: number;
  has_liked: boolean;
}

const FeedList: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);

      // Fetch posts with profile data
      const postsData = await getPostsWithProfiles();

      // If no posts yet, return early
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      // If user is logged in, check which posts they've liked
      let enhancedPosts = [...postsData];
      
      if (user) {
        const likedPostIds = await getUserLikedPostIds(user.id);
        
        enhancedPosts = postsData.map(post => ({
          ...post,
          has_liked: likedPostIds.includes(post.id)
        }));
      }

      setPosts(enhancedPosts as PostType[]);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast.error('Erro ao carregar publicações', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger refresh of posts
  const refreshPosts = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    fetchPosts();
  }, [refreshKey, user]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl mx-auto text-center py-10"
      >
        <p className="text-muted-foreground">Nenhuma publicação encontrada.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Seja o primeiro a compartilhar conteúdo com a comunidade!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="space-y-4">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Post 
              id={post.id}
              author={{
                name: post.profiles.full_name || post.profiles.username,
                username: post.profiles.username,
                avatar: post.profiles.avatar_url || 'https://via.placeholder.com/150',
                verified: post.profiles.username?.toLowerCase() === 'outliersofc'
              }}
              content={post.content}
              images={post.images || []}
              timestamp={new Date(post.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
              likes={post.likes}
              comments={post.comments}
              hasLiked={post.has_liked}
              onRefresh={refreshPosts}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default FeedList;
