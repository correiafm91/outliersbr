
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import ProfileForm from '@/components/profile/ProfileForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Share2, Grid3X3, Bookmark, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Post from '@/components/feed/Post';
import { motion } from 'framer-motion';
import { getPostsByUserId, getUserLikedPostIds } from '@/integrations/supabase/functions';

interface ProfileType {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  industry: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_public: boolean | null;
  post_count: number;
}

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

const Profile: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const [profileData, setProfileData] = useState<ProfileType | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Determine if viewing own profile or another user's profile
  useEffect(() => {
    if (!authLoading) {
      if (!username && user) {
        setIsOwnProfile(true);
        fetchProfile(user.id);
        fetchUserPosts(user.id);
      } else if (username) {
        setIsOwnProfile(false);
        fetchProfileByUsername(username);
      } else if (!user) {
        navigate('/');
      }
    }
  }, [username, user, authLoading, navigate, refreshKey]);

  const fetchProfile = async (userId: string) => {
    try {
      setIsProfileLoading(true);
      
      // Fetch the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      // Count the user's posts
      const { count, error: countError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
        
      if (countError) throw countError;
      
      setProfileData({
        ...data,
        post_count: count || 0
      });
    } catch (error: any) {
      toast.error('Erro ao carregar perfil', {
        description: error.message,
      });
      console.error('Error fetching profile:', error);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const fetchProfileByUsername = async (usernameToFetch: string) => {
    try {
      setIsProfileLoading(true);
      
      // Fetch the profile by username
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', usernameToFetch)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Perfil não encontrado');
          navigate('/');
          return;
        }
        throw error;
      }
      
      // Check if this is the current user's profile
      if (user && data.id === user.id) {
        setIsOwnProfile(true);
      }
      
      // Count the user's posts
      const { count, error: countError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.id);
        
      if (countError) throw countError;
      
      setProfileData({
        ...data,
        post_count: count || 0
      });
      
      // Fetch posts for this profile
      fetchUserPosts(data.id);
    } catch (error: any) {
      toast.error('Erro ao carregar perfil', {
        description: error.message,
      });
      console.error('Error fetching profile by username:', error);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    try {
      setIsPostsLoading(true);
      
      // Get posts for the user with the helper function
      const postsData = await getPostsByUserId(userId);
      
      // If no posts yet, return early
      if (!postsData || postsData.length === 0) {
        setUserPosts([]);
        setIsPostsLoading(false);
        return;
      }
      
      // If current user is logged in, check which posts they've liked
      let enhancedPosts = [...postsData];
      
      if (user) {
        const likedPostIds = await getUserLikedPostIds(user.id);
        
        enhancedPosts = postsData.map(post => ({
          ...post,
          has_liked: likedPostIds.includes(post.id)
        }));
      }
      
      setUserPosts(enhancedPosts as PostType[]);
    } catch (error: any) {
      console.error('Error fetching user posts:', error);
      toast.error('Erro ao carregar publicações', {
        description: error.message,
      });
    } finally {
      setIsPostsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleProfileUpdated = () => {
    setIsEditMode(false);
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleShare = () => {
    if (profileData) {
      const url = `${window.location.origin}/profile/${profileData.username}`;
      
      if (navigator.share) {
        navigator.share({
          title: `Perfil de ${profileData.username} - Outliers`,
          text: `Confira o perfil de ${profileData.full_name || profileData.username} no Outliers!`,
          url: url
        }).catch(err => {
          console.error('Error sharing:', err);
          copyToClipboard(url);
        });
      } else {
        copyToClipboard(url);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copiado para a área de transferência');
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast.error('Erro ao copiar link');
    });
  };

  if (authLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-background text-foreground">
        {isEditMode ? (
          <div className="max-w-md mx-auto pt-6 px-4">
            <div className="flex items-center mb-4">
              <Button variant="ghost" onClick={() => setIsEditMode(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <h1 className="text-xl font-bold">Editar Perfil</h1>
            </div>
            <ProfileForm initialData={profileData || undefined} onSuccess={handleProfileUpdated} />
          </div>
        ) : profileData ? (
          <div className="max-w-xl mx-auto">
            {/* Profile Header */}
            <div className="relative mb-4">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/40 w-full"></div>
              <div className="px-4">
                <div className="flex justify-between -mt-16">
                  <Avatar className="h-24 w-24 border-4 border-background">
                    <AvatarImage src={profileData.avatar_url || undefined} alt={profileData.username} />
                    <AvatarFallback className="bg-primary/20 text-xl font-bold">
                      {profileData.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="mt-16 flex gap-2">
                    {isOwnProfile ? (
                      <Button variant="outline" onClick={handleEditClick}>
                        Editar Perfil
                      </Button>
                    ) : (
                      <Button variant="default">
                        Seguir
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleShare}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{profileData.full_name || profileData.username}</h1>
                    {profileData.username.toLowerCase() === 'outliersofc' && (
                      <Badge className="bg-primary text-primary-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Oficial
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">@{profileData.username}</p>
                  {profileData.industry && (
                    <p className="text-sm mt-1">{profileData.industry}</p>
                  )}
                  {profileData.bio && (
                    <p className="mt-4">{profileData.bio}</p>
                  )}
                  
                  <div className="flex gap-4 mt-4 text-sm">
                    <span><strong>{profileData.post_count}</strong> publicações</span>
                    <span><strong>0</strong> seguidores</span>
                    <span><strong>0</strong> seguindo</span>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    {profileData.website_url && (
                      <a 
                        href={profileData.website_url.startsWith('http') ? profileData.website_url : `https://${profileData.website_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Website
                      </a>
                    )}
                    {profileData.linkedin_url && (
                      <a 
                        href={profileData.linkedin_url.startsWith('http') ? profileData.linkedin_url : `https://${profileData.linkedin_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content Tabs */}
            <Tabs defaultValue="posts" className="w-full px-4">
              <TabsList className="w-full">
                <TabsTrigger value="posts" className="flex-1">
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Publicações
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex-1">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Salvos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="mt-4">
                {isPostsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-4">
                    {userPosts.map((post, index) => (
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
                          onRefresh={() => setRefreshKey(prev => prev + 1)}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Grid3X3 className="h-10 w-10 mx-auto opacity-30" />
                    <p className="mt-4 text-muted-foreground">Nenhuma publicação para exibir</p>
                    {isOwnProfile && (
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/create">Criar sua primeira publicação</Link>
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="saved" className="mt-4">
                <div className="text-center py-10">
                  <Bookmark className="h-10 w-10 mx-auto opacity-30" />
                  <p className="mt-4 text-muted-foreground">Nenhum item salvo</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-xl">Perfil não encontrado</p>
              <Button variant="link" asChild className="mt-4">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </div>
        )}
        
        <BottomNav />
      </main>
    </PageTransition>
  );
};

export default Profile;
