
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Users, Tag, Filter, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Post from '@/components/feed/Post';
import { Badge } from '@/components/ui/badge';
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

const Explore: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  
  useEffect(() => {
    fetchPosts();
    fetchTrendingPosts();
    fetchPopularTags();
  }, [user]);
  
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
  
  const fetchTrendingPosts = async () => {
    try {
      // Here we would typically fetch trending posts based on likes/comments
      // For now, we'll just set it the same as regular posts
      // In a real implementation, you would rank posts by engagement metrics
      const postsData = await getPostsWithProfiles();
      
      // If user is logged in, check which posts they've liked
      let enhancedPosts = [...postsData];
      
      if (user) {
        const likedPostIds = await getUserLikedPostIds(user.id);
        
        enhancedPosts = postsData.map(post => ({
          ...post,
          has_liked: likedPostIds.includes(post.id)
        }));
      }
      
      // Sort by likes and comments (simple algorithm for trending)
      enhancedPosts.sort((a, b) => 
        (b.likes * 2 + b.comments) - (a.likes * 2 + a.comments)
      );
      
      setTrendingPosts(enhancedPosts as PostType[]);
    } catch (error: any) {
      console.error('Error fetching trending posts:', error);
    }
  };
  
  const fetchPopularTags = async () => {
    try {
      // In a real implementation, you would aggregate and count tags from posts
      // For now, we'll just set some example tags
      setPopularTags(['#networking', '#business', '#tech', '#marketing', '#startup']);
    } catch (error: any) {
      console.error('Error fetching popular tags:', error);
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPosts();
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Search in posts content
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id(username, avatar_url, full_name)
        `)
        .eq('is_public', true)
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false });
        
      if (postsError) throw postsError;
      
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoading(false);
        return;
      }
      
      // Get post IDs for likes and comments count
      const postIds = postsData.map(post => post.id);
      
      // Count likes for each post
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id')
        .in('post_id', postIds);
        
      if (likesError) throw likesError;
      
      // Group likes by post_id and count
      const likesCount: Record<string, number> = {};
      likesData?.forEach(like => {
        likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
      });
      
      // Count comments for each post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);
        
      if (commentsError) throw commentsError;
      
      // Group comments by post_id and count
      const commentsCount: Record<string, number> = {};
      commentsData?.forEach(comment => {
        commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
      });
      
      // Check if user has liked each post
      let userLikes: Record<string, boolean> = {};
      
      if (user) {
        const { data: userLikesData, error: userLikesError } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
          
        if (userLikesError) throw userLikesError;
        
        userLikes = (userLikesData || []).reduce((acc, like) => {
          acc[like.post_id] = true;
          return acc;
        }, {} as Record<string, boolean>);
      }
      
      // Combine all data
      const enhancedPosts = postsData.map(post => {
        // Ensure we have the correct profiles structure
        const profileData = post.profiles || {
          username: 'usuário',
          avatar_url: null,
          full_name: null
        };
        
        return {
          ...post,
          profiles: profileData,
          likes: likesCount[post.id] || 0,
          comments: commentsCount[post.id] || 0,
          has_liked: !!userLikes[post.id]
        } as PostType;
      });
      
      setPosts(enhancedPosts);
    } catch (error: any) {
      console.error('Error searching posts:', error);
      toast.error('Erro na busca', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleTag = (tag: string) => {
    if (activeTags.includes(tag)) {
      setActiveTags(activeTags.filter(t => t !== tag));
    } else {
      setActiveTags([...activeTags, tag]);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-background text-foreground">
        <div className="max-w-xl mx-auto px-4 pt-6">
          <h1 className="text-3xl font-bold mb-6">Explorar</h1>
          
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Pesquisar conteúdo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {popularTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={activeTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          <Tabs defaultValue="recent">
            <TabsList className="w-full">
              <TabsTrigger value="recent" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Recentes
              </TabsTrigger>
              <TabsTrigger value="trending" className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Em alta
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : posts.length > 0 ? (
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
                        onRefresh={fetchPosts}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhuma publicação encontrada</p>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Tente usar termos diferentes na sua busca
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="trending" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : trendingPosts.length > 0 ? (
                <div className="space-y-4">
                  {trendingPosts.map((post, index) => (
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
                        onRefresh={fetchPosts}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhuma publicação em alta no momento</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <BottomNav />
      </main>
    </PageTransition>
  );
};

export default Explore;
