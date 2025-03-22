
import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import Post from '@/components/feed/Post';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PostType[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<PostType[]>([]);
  const [latestPosts, setLatestPosts] = useState<PostType[]>([]);
  const [activeTab, setActiveTab] = useState('trending');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);

      // Fetch posts with profile data
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id(username, avatar_url, full_name)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // If no posts yet, return early
      if (!postsData || postsData.length === 0) {
        setTrendingPosts([]);
        setLatestPosts([]);
        setIsLoading(false);
        return;
      }

      // Get post IDs for likes and comments queries
      const postIds = postsData.map(post => post.id);

      // Count likes for each post
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id, count(*)')
        .in('post_id', postIds)
        .group('post_id');

      if (likesError) throw likesError;

      // Count comments for each post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('post_id, count(*)')
        .in('post_id', postIds)
        .group('post_id');

      if (commentsError) throw commentsError;

      // Check if current user has liked each post
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

      // Convert likes and comments to a map for easier lookup
      const likesMap = (likesData || []).reduce((acc, item) => {
        acc[item.post_id] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>);

      const commentsMap = (commentsData || []).reduce((acc, item) => {
        acc[item.post_id] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>);

      // Combine all data
      const enhancedPosts = postsData.map(post => ({
        ...post,
        likes: likesMap[post.id] || 0,
        comments: commentsMap[post.id] || 0,
        has_liked: !!userLikes[post.id]
      }));

      // Sort by latest for latestPosts
      const latest = [...enhancedPosts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Sort by engagement (likes + comments) for trendingPosts
      const trending = [...enhancedPosts].sort(
        (a, b) => (b.likes + b.comments) - (a.likes + a.comments)
      );

      setLatestPosts(latest);
      setTrendingPosts(trending);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast.error('Erro ao carregar publicações', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para pesquisar');
      return;
    }

    try {
      setIsSearching(true);
      setActiveTab('search');

      // Search for posts with content matching the query
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id(username, avatar_url, full_name)
        `)
        .eq('is_public', true)
        .or(`content.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // If no posts found, set empty array and return
      if (!postsData || postsData.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Get post IDs for likes and comments queries
      const postIds = postsData.map(post => post.id);

      // Count likes for each post
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id, count(*)')
        .in('post_id', postIds)
        .group('post_id');

      if (likesError) throw likesError;

      // Count comments for each post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('post_id, count(*)')
        .in('post_id', postIds)
        .group('post_id');

      if (commentsError) throw commentsError;

      // Check if current user has liked each post
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

      // Convert likes and comments to a map for easier lookup
      const likesMap = (likesData || []).reduce((acc, item) => {
        acc[item.post_id] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>);

      const commentsMap = (commentsData || []).reduce((acc, item) => {
        acc[item.post_id] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>);

      // Combine all data
      const enhancedPosts = postsData.map(post => ({
        ...post,
        likes: likesMap[post.id] || 0,
        comments: commentsMap[post.id] || 0,
        has_liked: !!userLikes[post.id]
      }));

      setSearchResults(enhancedPosts);
    } catch (error: any) {
      console.error('Error searching posts:', error);
      toast.error('Erro ao pesquisar publicações', {
        description: error.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const refreshData = () => {
    fetchPosts();
  };

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-background text-foreground">
        <div className="page-container px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold mt-8 mb-2 text-foreground">Explorar</h1>
            <p className="text-muted-foreground">Descubra conteúdos populares da rede</p>
          </motion.div>

          <div className="mb-6">
            <div className="flex gap-2">
              <Input
                placeholder="Pesquisar por conteúdo ou tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="text-foreground"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Tabs 
            defaultValue="trending" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="latest">Recentes</TabsTrigger>
              <TabsTrigger value="search" disabled={searchResults.length === 0}>Resultados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trending">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : trendingPosts.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhuma publicação encontrada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trendingPosts.map((post) => (
                    <Post
                      key={post.id}
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
                      onRefresh={refreshData}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="latest">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : latestPosts.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhuma publicação encontrada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {latestPosts.map((post) => (
                    <Post
                      key={post.id}
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
                      onRefresh={refreshData}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="search">
              {isSearching ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhum resultado encontrado para "{searchQuery}".</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchResults.length} resultados para "{searchQuery}"
                  </p>
                  {searchResults.map((post) => (
                    <Post
                      key={post.id}
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
                      onRefresh={refreshData}
                    />
                  ))}
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
