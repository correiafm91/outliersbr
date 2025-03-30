import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import ProfileForm from '@/components/profile/ProfileForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getPostsByUserId, getUserLikedPostIds, getSavedPostsByUserId } from '@/integrations/supabase/functions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from 'framer-motion';
import Post from '@/components/feed/Post';
import { 
  Pencil, 
  User, 
  LogOut, 
  Link as LinkIcon, 
  Briefcase, 
  ArrowLeft, 
  RefreshCcw, 
  AlertCircle,
  CheckCircle,
  Share2,
  BookmarkIcon,
  Grid3X3Icon,
  Image as ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import FollowButton from '@/components/follow/FollowButton';
import FollowersDialog from '@/components/follow/FollowersDialog';
import BannerUpload from '@/components/profile/BannerUpload';

interface ProfileType {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  industry: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_public: boolean | null;
  post_count: number;
  follower_count: number;
  following_count: number;
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
  const [savedPosts, setSavedPosts] = useState<PostType[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isSavedPostsLoading, setIsSavedPostsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);

  useEffect(() => {
    console.log('Profile page load state:', { 
      authLoading, 
      isProfileLoading, 
      isPostsLoading,
      username: username || 'own profile'
    });
    
    if (isProfileLoading || isPostsLoading) {
      const timer = setTimeout(() => {
        setShowLoadingHelp(true);
      }, 2000); // Reduced from 3000 to 2000 ms for faster feedback
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingHelp(false);
    }
  }, [isProfileLoading, isPostsLoading, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      setLoadError(null);
      if (!username && user) {
        console.log('Profile: Loading own profile for user ID:', user.id);
        setIsOwnProfile(true);
        
        const loadProfile = async () => {
          let attempts = 2;
          while (attempts >= 0) {
            try {
              await fetchProfile(user.id);
              break; // Exit loop if successful
            } catch (error) {
              console.error(`Error loading profile (attempt ${2-attempts}/2):`, error);
              if (attempts > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts--;
              } else {
                setLoadError('Não foi possível carregar o perfil. Tente novamente.');
              }
            }
          }
        };
        
        const loadPosts = async () => {
          let attempts = 2;
          while (attempts >= 0) {
            try {
              await fetchUserPosts(user.id);
              break; // Exit loop if successful
            } catch (error) {
              console.error(`Error loading posts (attempt ${2-attempts}/2):`, error);
              if (attempts > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts--;
              } else {
                setIsPostsLoading(false);
              }
            }
          }
        };
        
        loadProfile();
        loadPosts();
      } else if (username) {
        console.log('Profile: Loading profile for username:', username);
        setIsOwnProfile(false);
        
        const loadProfileByUsername = async () => {
          let attempts = 2;
          while (attempts >= 0) {
            try {
              await fetchProfileByUsername(username);
              break; // Exit loop if successful
            } catch (error) {
              console.error(`Error loading profile by username (attempt ${2-attempts}/2):`, error);
              if (attempts > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts--;
              } else {
                setLoadError('Não foi possível carregar o perfil. Tente novamente.');
              }
            }
          }
        };
        
        loadProfileByUsername();
      } else if (!user) {
        console.log('Profile: No user logged in, redirecting to home');
        navigate('/');
      }
    }
  }, [username, user, authLoading, navigate, refreshKey]);

  useEffect(() => {
    if (activeTab === 'saved' && user && !isSavedPostsLoading && savedPosts.length === 0) {
      fetchSavedPosts(user.id);
    }
  }, [activeTab, user, savedPosts.length, isSavedPostsLoading]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Profile: Starting to fetch profile data for userId:', userId);
      setIsProfileLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal);
        
      clearTimeout(timeoutId);

      if (error) {
        console.error('Profile: Error fetching profile data:', error);
        throw error;
      }
      
      console.log('Profile: Successfully fetched profile data');
      
      const countController = new AbortController();
      const countTimeoutId = setTimeout(() => countController.abort(), 5000);
      
      let postCount = 0;
      try {
        const { count, error: postCountError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .abortSignal(countController.signal);
          
        if (!postCountError) {
          postCount = count || 0;
        }
      } catch (error) {
        console.error('Error counting posts, using fallback:', error);
      }
      
      let followerCount = 0;
      try {
        const { count, error: followerCountError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId)
          .abortSignal(countController.signal);

        if (!followerCountError) {
          followerCount = count || 0;
        }
      } catch (error) {
        console.error('Error counting followers, using fallback:', error);
      }
      
      let followingCount = 0;
      try {
        const { count, error: followingCountError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId)
          .abortSignal(countController.signal);

        if (!followingCountError) {
          followingCount = count || 0;
        }
      } catch (error) {
        console.error('Error counting following, using fallback:', error);
      }
      
      clearTimeout(countTimeoutId);
      
      console.log('Profile: User has', postCount, 'posts,', followerCount, 'followers and is following', followingCount, 'users');
      
      const completeProfile: ProfileType = {
        ...data,
        post_count: postCount,
        follower_count: followerCount,
        following_count: followingCount,
        banner_url: data.banner_url || null
      };
      
      setProfileData(completeProfile);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setLoadError(`Erro ao carregar perfil: ${error.message || 'Conexão falhou'}`);
      toast.error('Erro ao carregar perfil', {
        description: error.message || 'Tente novamente mais tarde',
      });
      throw error;
    } finally {
      setIsProfileLoading(false);
    }
  };

  const fetchProfileByUsername = async (usernameToFetch: string) => {
    try {
      console.log('Profile: Starting to fetch profile by username:', usernameToFetch);
      setIsProfileLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', usernameToFetch)
        .maybeSingle()
        .abortSignal(controller.signal);
        
      clearTimeout(timeoutId);

      if (error) {
        console.error('Profile: Error fetching profile by username:', error);
        throw error;
      }
      
      if (!data) {
        console.error('Profile: No profile found for username:', usernameToFetch);
        toast.error('Perfil não encontrado');
        navigate('/');
        return;
      }
      
      console.log('Profile: Successfully fetched profile by username');
      
      if (user && data.id === user.id) {
        console.log('Profile: This is the current user\'s profile');
        setIsOwnProfile(true);
      }
      
      const countController = new AbortController();
      const countTimeoutId = setTimeout(() => countController.abort(), 5000);
      
      let postCount = 0;
      try {
        const { count, error: postCountError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', data.id)
          .abortSignal(countController.signal);
          
        if (!postCountError) {
          postCount = count || 0;
        }
      } catch (error) {
        console.error('Error counting posts, using fallback:', error);
      }
      
      let followerCount = 0;
      try {
        const { count, error: followerCountError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', data.id)
          .abortSignal(countController.signal);

        if (!followerCountError) {
          followerCount = count || 0;
        }
      } catch (error) {
        console.error('Error counting followers, using fallback:', error);
      }
      
      let followingCount = 0;
      try {
        const { count, error: followingCountError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', data.id)
          .abortSignal(countController.signal);

        if (!followingCountError) {
          followingCount = count || 0;
        }
      } catch (error) {
        console.error('Error counting following, using fallback:', error);
      }
      
      clearTimeout(countTimeoutId);
      
      console.log('Profile: User has', postCount, 'posts,', followerCount, 'followers and is following', followingCount, 'users');
      
      const completeProfile: ProfileType = {
        ...data,
        post_count: postCount,
        follower_count: followerCount,
        following_count: followingCount,
        banner_url: data.banner_url || null
      };
      
      setProfileData(completeProfile);
      
      fetchUserPosts(data.id);
    } catch (error: any) {
      console.error('Error fetching profile by username:', error);
      setLoadError(`Erro ao carregar perfil: ${error.message || 'Conexão falhou'}`);
      toast.error('Erro ao carregar perfil', {
        description: error.message || 'Tente novamente mais tarde',
      });
      throw error;
    } finally {
      setIsProfileLoading(false);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    try {
      console.log('Profile: Starting to fetch posts for userId:', userId);
      setIsPostsLoading(true);
      
      const postsData = await getPostsByUserId(userId);
      console.log('Profile: Received posts data:', { 
        postCount: postsData?.length || 0,
        success: !!postsData 
      });
      
      if (!postsData || postsData.length === 0) {
        console.log('Profile: No posts found for this user');
        setUserPosts([]);
        setIsPostsLoading(false);
        return;
      }
      
      let enhancedPosts = [...postsData];
      
      if (user) {
        console.log('Profile: Fetching liked posts for user');
        try {
          const likedPostIds = await getUserLikedPostIds(user.id);
          console.log('Profile: User has liked', likedPostIds.length, 'posts');
          
          enhancedPosts = postsData.map(post => ({
            ...post,
            has_liked: likedPostIds.includes(post.id)
          }));
        } catch (error) {
          console.error('Error fetching liked posts, continuing without like status:', error);
        }
      }
      
      setUserPosts(enhancedPosts as PostType[]);
      console.log('Profile: Posts processing complete');
    } catch (error: any) {
      console.error('Error fetching user posts:', error);
      setLoadError(`Erro ao carregar publicações: ${error.message || 'Conexão falhou'}`);
      toast.error('Erro ao carregar publicações', {
        description: error.message || 'Tente novamente mais tarde',
      });
    } finally {
      setIsPostsLoading(false);
    }
  };

  const fetchSavedPosts = async (userId: string) => {
    try {
      console.log('Profile: Starting to fetch saved posts for userId:', userId);
      setIsSavedPostsLoading(true);
      
      const savedPostsData = await getSavedPostsByUserId(userId);
      console.log('Profile: Received saved posts data:', { 
        postCount: savedPostsData?.length || 0,
        success: !!savedPostsData 
      });
      
      if (!savedPostsData || savedPostsData.length === 0) {
        console.log('Profile: No saved posts found for this user');
        setSavedPosts([]);
        setIsSavedPostsLoading(false);
        return;
      }
      
      let enhancedPosts = [...savedPostsData];
      
      if (user) {
        console.log('Profile: Fetching liked posts for user');
        try {
          const likedPostIds = await getUserLikedPostIds(user.id);
          console.log('Profile: User has liked', likedPostIds.length, 'posts');
          
          enhancedPosts = savedPostsData.map(post => ({
            ...post,
            has_liked: likedPostIds.includes(post.id)
          }));
        } catch (error) {
          console.error('Error fetching liked posts, continuing without like status:', error);
        }
      }
      
      setSavedPosts(enhancedPosts as PostType[]);
      console.log('Profile: Saved posts processing complete');
    } catch (error: any) {
      console.error('Error fetching saved posts:', error);
      toast.error('Erro ao carregar publicações salvas', {
        description: error.message || 'Tente novamente mais tarde',
      });
    } finally {
      setIsSavedPostsLoading(false);
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
  
  const handleRefresh = () => {
    console.log('Profile: Refreshing page data');
    setRefreshKey(prevKey => prevKey + 1);
    setShowLoadingHelp(false);
    setLoadError(null);
    
    toast.info('Atualizando dados...');
  };

  const handleFollowChange = () => {
    if (profileData) {
      fetchProfileByUsername(profileData.username);
    }
  };

  const handleBannerChange = (url: string | null) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        banner_url: url
      });
    }
  };

  if (authLoading || isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
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
            <div className="relative mb-4">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/40 w-full relative">
                {profileData.banner_url && (
                  <img 
                    src={profileData.banner_url} 
                    alt="Banner" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <BannerUpload 
                  userId={profileData.id} 
                  currentBanner={profileData.banner_url} 
                  onBannerChange={handleBannerChange}
                />
              </div>
              <div className="px-4">
                <div className="flex justify-between -mt-16">
                  <Avatar className="h-24 w-24 border-4 border-background cursor-pointer">
                    <AvatarImage 
                      src={profileData.avatar_url || undefined} 
                      alt={profileData.username} 
                    />
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
                      <FollowButton 
                        targetUserId={profileData.id} 
                        onFollowChange={handleFollowChange}
                      />
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
                    <FollowersDialog 
                      userId={profileData.id}
                      username={profileData.username}
                      followersCount={profileData.follower_count}
                      followingCount={profileData.following_count}
                    />
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
            
            <Tabs defaultValue="posts" value={activeTab} onValueChange={setActiveTab} className="w-full px-4">
              <TabsList className="w-full">
                <TabsTrigger value="posts" className="flex-1">
                  <Grid3X3Icon className="h-4 w-4 mr-2" />
                  Publicações
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex-1">
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
                    {isOwnProfile && (
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/create">Criar sua primeira publicação</Link>
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="saved" className="mt-4">
                {!isOwnProfile ? (
                  <div className="text-center py-10">
                    <BookmarkIcon className="h-10 w-10 mx-auto opacity-30" />
                    <p className="mt-4 text-muted-foreground">Posts salvos são visíveis apenas para você</p>
                  </div>
                ) : isSavedPostsLoading ? (
                  <div className="flex flex-col justify-center items-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                    <p className="text-muted-foreground">Carregando publicações salvas...</p>
                  </div>
                ) : savedPosts.length > 0 ? (
                  <div className="space-y-4">
                    {savedPosts.map((post, index) => (
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
                    <BookmarkIcon className="h-10 w-10 mx-auto opacity-30" />
                    <p className="mt-4 text-muted-foreground">Nenhum item salvo</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link to="/explore">Explorar publicações</Link>
                    </Button>
                  </div>
                )}
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
