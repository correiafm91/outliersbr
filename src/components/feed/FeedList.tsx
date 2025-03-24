
import React, { useState, useEffect, useCallback } from 'react';
import Post from './Post';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import { getPostsWithProfiles, getUserLikedPostIds } from '@/integrations/supabase/functions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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

interface FeedListProps {
  onLoadStateChange?: (isLoaded: boolean) => void;
}

const FeedList: React.FC<FeedListProps> = ({ onLoadStateChange }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingHelp(true);
      }, 2000); // Reduced from 3000 to 2000 ms for faster feedback
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingHelp(false);
    }
  }, [isLoading]);

  const fetchPosts = useCallback(async () => {
    try {
      console.log('FeedList: Starting to fetch posts');
      setIsLoading(true);
      setLoadError(null);
      if (onLoadStateChange) onLoadStateChange(false);

      // Fetch posts with profile data with a timeout
      const fetchPromise = getPostsWithProfiles();
      
      // Set a timeout for the fetch operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('A conexão expirou, tente novamente')), 3000); // Reduced from 5000 to 3000
      });
      
      // Race the fetch against the timeout
      const postsData = await Promise.race([fetchPromise, timeoutPromise]) as PostType[] | null;
      
      console.log('FeedList: Received posts data:', { 
        postCount: postsData?.length || 0,
        success: !!postsData 
      });

      // If no posts yet, return early
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoading(false);
        if (onLoadStateChange) onLoadStateChange(true);
        return;
      }

      // If user is logged in, check which posts they've liked
      let enhancedPosts = [...postsData];
      
      if (user) {
        console.log('FeedList: Fetching liked posts for user');
        const likedPostIds = await getUserLikedPostIds(user.id);
        console.log('FeedList: User has liked', likedPostIds.length, 'posts');
        
        enhancedPosts = postsData.map(post => ({
          ...post,
          has_liked: likedPostIds.includes(post.id)
        }));
      }

      setPosts(enhancedPosts);
      console.log('FeedList: Posts processing complete');
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setLoadError(`Erro ao carregar publicações: ${error.message}`);
      toast.error('Erro ao carregar publicações', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
      if (onLoadStateChange) onLoadStateChange(true);
      console.log('FeedList: Loading state set to false');
    }
  }, [user, onLoadStateChange]);

  // Trigger refresh of posts
  const refreshPosts = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    fetchPosts();
  }, [refreshKey, fetchPosts]);

  const handleRetry = () => {
    setShowLoadingHelp(false);
    refreshPosts();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-center">Carregando publicações...</p>
        
        {(showLoadingHelp || loadError) && (
          <div className="mt-4 max-w-md text-center">
            <Alert variant="default" className="bg-background border-primary/50">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle className="text-foreground">
                {loadError ? 'Ocorreu um erro' : 'Está demorando mais que o esperado'}
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {loadError || 'O sistema pode estar enfrentando dificuldades de conexão. Tente novamente.'}
              </AlertDescription>
              <Button 
                size="sm" 
                className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleRetry}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </Alert>
          </div>
        )}
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
