
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  getProfileByUsername, 
  getFollowersCount, 
  getFollowingCount, 
  isFollowingUser, 
  followUser, 
  unfollowUser,
  getPostsByUserId,
  getUserLikedPostIds
} from '@/integrations/supabase/functions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from 'framer-motion';
import Post from '@/components/feed/Post';
import { 
  User,
  Share2,
  BookmarkIcon,
  Grid3X3Icon,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Types
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
  followers_count: number;
  following_count: number;
  is_followed: boolean;
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

const UserProfilePage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const [profileData, setProfileData] = useState<ProfileType | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Add loading indicator timeout
  useEffect(() => {
    if (isProfileLoading || isPostsLoading) {
      const timer = setTimeout(() => {
        setShowLoadingHelp(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingHelp(false);
    }
  }, [isProfileLoading, isPostsLoading]);
  
  // Load the profile data
  useEffect(() => {
    if (!authLoading && username) {
      setLoadError(null);
      fetchProfileByUsername(username);
    }
  }, [username, authLoading, refreshKey]);
  
  const fetchProfileByUsername = async (usernameToFetch: string) => {
    try {
      setIsProfileLoading(true);
      
      const profileData = await getProfileByUsername(usernameToFetch);
      
      if (!profileData) {
        toast.error('Perfil não encontrado');
        navigate('/');
        return;
      }
      
      // Get follower and following counts
      const followers = await getFollowersCount(profileData.id);
      const following = await getFollowingCount(profileData.id);
      setFollowersCount(followers);
      setFollowingCount(following);
      
      // Check if current user is following this profile
      let isFollowed = false;
      if (user) {
        isFollowed = await isFollowingUser(profileData.id);
        setIsFollowing(isFollowed);
      }
      
      // Get post count
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileData.id);
      
      // Set complete profile data
      setProfileData({
        ...profileData,
        post_count: count || 0,
        followers_count: followers,
        following_count: following,
        is_followed: isFollowed
      });
      
      // Load posts for this user
      fetchUserPosts(profileData.id);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setLoadError(`Erro ao carregar perfil: ${error.message}`);
      toast.error('Erro ao carregar perfil', {
        description: error.message,
      });
    } finally {
      setIsProfileLoading(false);
    }
  };
  
  const fetchUserPosts = async (userId: string) => {
    try {
      setIsPostsLoading(true);
      
      const postsData = await getPostsByUserId(userId);
      
      if (!postsData || postsData.length === 0) {
        setUserPosts([]);
        setIsPostsLoading(false);
        return;
      }
      
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
      setLoadError(`Erro ao carregar publicações: ${error.message}`);
      toast.error('Erro ao carregar publicações', {
        description: error.message,
      });
    } finally {
      setIsPostsLoading(false);
    }
  };
  
  const handleFollowToggle = async () => {
    if (!user || !profileData) return;
    
    try {
      setIsFollowLoading(true);
      
      if (isFollowing) {
        // Unfollow
        const success = await unfollowUser(profileData.id);
        if (success) {
          setIsFollowing(false);
          setFollowersCount(prev => Math.max(0, prev - 1));
          toast.success(`Você deixou de seguir @${profileData.username}`);
        }
      } else {
        // Follow
        const success = await followUser(profileData.id);
        if (success) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
          toast.success(`Você começou a seguir @${profileData.username}`);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Erro ao atualizar seguidores');
    } finally {
      setIsFollowLoading(false);
    }
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
  
  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setShowLoadingHelp(false);
    setLoadError(null);
  };
  
  const navigateToFollowers = () => {
    if (profileData) {
      navigate(`/follow/followers?username=${profileData.username}`);
    }
  };
  
  const navigateToFollowing = () => {
    if (profileData) {
      navigate(`/follow/following?username=${profileData.username}`);
    }
  };

  // Loading state
  if (authLoading || isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground text-center">Carregando perfil...</p>
        
        {(showLoadingHelp || loadError) && (
          <div className="mt-8 max-w-md text-center">
            <Alert variant="default" className="bg-background border-primary/50">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle className="text-foreground">
                {loadError ? 'Ocorreu um erro' : 'Está demorando mais que o esperado'}
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {loadError || 'O sistema pode estar enfrentando dificuldades de conexão. Tente recarregar a página.'}
              </AlertDescription>
              <Button 
                size="sm" 
                className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleRefresh}
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

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-black text-white">
        {profileData ? (
          <div className="max-w-xl mx-auto">
            {/* Back button */}
            <div className="p-4">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
            
            <div className="relative mb-4">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/40 w-full"></div>
              <div className="px-4">
                <div className="flex justify-between -mt-16">
                  <Avatar className="h-24 w-24 border-4 border-black">
                    <AvatarImage 
                      src={profileData.avatar_url || undefined} 
                      alt={profileData.username}
                      className="object-cover" // Prevent image distortion
                    />
                    <AvatarFallback className="bg-primary/20 text-xl font-bold">
                      {profileData.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="mt-16 flex gap-2">
                    {user?.id !== profileData.id && (
                      <Button 
                        variant={isFollowing ? "outline" : "default"}
                        className={isFollowing ? "border-primary text-primary" : ""}
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                      >
                        {isFollowLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        ) : isFollowing ? (
                          <UserMinus className="h-4 w-4 mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        {isFollowing ? 'Seguindo' : 'Seguir'}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleShare} className="text-white">
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
                    <button 
                      onClick={() => navigate(`/profile/${profileData.username}`)}
                      className="hover:underline"
                    >
                      <strong>{profileData.post_count}</strong> publicações
                    </button>
                    <button 
                      onClick={navigateToFollowers}
                      className="hover:underline"
                    >
                      <strong>{followersCount}</strong> seguidores
                    </button>
                    <button 
                      onClick={navigateToFollowing}
                      className="hover:underline"
                    >
                      <strong>{followingCount}</strong> seguindo
                    </button>
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
            
            <Tabs defaultValue="posts" className="w-full px-4">
              <TabsList className="w-full bg-gray-900 text-white">
                <TabsTrigger value="posts" className="flex-1 data-[state=active]:bg-gray-800">
                  <Grid3X3Icon className="h-4 w-4 mr-2" />
                  Publicações
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex-1 data-[state=active]:bg-gray-800">
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  Salvos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="mt-4">
                {isPostsLoading ? (
                  <div className="flex flex-col justify-center items-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                    <p className="text-muted-foreground">Carregando publicações...</p>
                    
                    {(showLoadingHelp || loadError) && (
                      <div className="mt-8 max-w-md text-center">
                        <Alert variant="default" className="bg-background border-primary/50">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          <AlertTitle className="text-foreground">
                            {loadError ? 'Ocorreu um erro' : 'Está demorando mais que o esperado'}
                          </AlertTitle>
                          <AlertDescription className="text-muted-foreground">
                            {loadError || 'O sistema pode estar enfrentando dificuldades de conexão. Tente recarregar a página.'}
                          </AlertDescription>
                          <Button 
                            size="sm" 
                            className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={handleRefresh}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Tentar Novamente
                          </Button>
                        </Alert>
                      </div>
                    )}
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
                    <Grid3X3Icon className="h-10 w-10 mx-auto opacity-30" />
                    <p className="mt-4 text-muted-foreground">Nenhuma publicação para exibir</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="saved" className="mt-4">
                <div className="text-center py-10">
                  <BookmarkIcon className="h-10 w-10 mx-auto opacity-30" />
                  <p className="mt-4 text-muted-foreground">Conteúdo salvo não disponível</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-xl">Perfil não encontrado</p>
              <Button variant="link" asChild className="mt-4 text-primary">
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

export default UserProfilePage;
