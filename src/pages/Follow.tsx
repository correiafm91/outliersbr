
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  getProfileByUsername, 
  getFollowers, 
  getFollowing,
  followUser,
  unfollowUser,
  isFollowingUser
} from '@/integrations/supabase/functions';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, UserPlus, UserMinus, RefreshCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  industry: string | null;
  is_followed: boolean;
  loading?: boolean;
}

const FollowPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const type = location.pathname.includes('followers') ? 'followers' : 'following';
  const queryParams = new URLSearchParams(location.search);
  const username = queryParams.get('username');
  
  const [profileData, setProfileData] = useState<{ id: string; username: string } | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load profile data and followers/following
  useEffect(() => {
    const loadData = async () => {
      if (!username) {
        setError('Nome de usuário não especificado');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const profile = await getProfileByUsername(username);
        
        if (!profile) {
          setError('Perfil não encontrado');
          setIsLoading(false);
          return;
        }
        
        setProfileData({
          id: profile.id,
          username: profile.username
        });
        
        // Get followers or following based on type
        let userData: any[] = [];
        if (type === 'followers') {
          userData = await getFollowers(profile.id);
        } else {
          userData = await getFollowing(profile.id);
        }
        
        // Check if the logged in user is following each of these users
        if (user) {
          const enhancedUsers = await Promise.all(
            userData.map(async (profile) => {
              const isFollowed = await isFollowingUser(profile.id);
              return {
                ...profile,
                is_followed: isFollowed
              };
            })
          );
          setUsers(enhancedUsers);
        } else {
          setUsers(userData.map(profile => ({ ...profile, is_followed: false })));
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading follow data:', err);
        setError(err.message || 'Erro ao carregar dados');
        setIsLoading(false);
      }
    };
    
    if (!authLoading) {
      loadData();
    }
  }, [username, type, authLoading, user]);
  
  const handleFollowToggle = async (userId: string, index: number) => {
    if (!user) {
      toast.error('Você precisa estar logado para seguir usuários');
      return;
    }
    
    try {
      // Update local state first for immediate feedback
      const updatedUsers = [...users];
      updatedUsers[index] = {
        ...updatedUsers[index],
        is_followed: !updatedUsers[index].is_followed,
        loading: true
      };
      setUsers(updatedUsers);
      
      if (updatedUsers[index].is_followed) {
        // Follow user
        await followUser(userId);
        toast.success(`Você começou a seguir @${updatedUsers[index].username}`);
      } else {
        // Unfollow user
        await unfollowUser(userId);
        toast.success(`Você deixou de seguir @${updatedUsers[index].username}`);
      }
      
      // Update loading state
      updatedUsers[index] = {
        ...updatedUsers[index],
        loading: false
      };
      setUsers(updatedUsers);
    } catch (err) {
      console.error('Error toggling follow:', err);
      toast.error('Erro ao atualizar seguidor');
      
      // Revert the change on error
      const revertedUsers = [...users];
      revertedUsers[index] = {
        ...revertedUsers[index],
        is_followed: !revertedUsers[index].is_followed,
        loading: false
      };
      setUsers(revertedUsers);
    }
  };
  
  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-black text-white">
        <div className="max-w-xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-xl font-bold">
              {type === 'followers' ? 'Seguidores' : 'Seguindo'}
              {profileData ? ` de @${profileData.username}` : ''}
            </h1>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="bg-red-950 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button 
                size="sm" 
                className="mt-2 bg-primary/30 text-white hover:bg-primary/50"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Alert>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                {type === 'followers' 
                  ? 'Este usuário ainda não tem seguidores' 
                  : 'Este usuário ainda não segue ninguém'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((userProfile, index) => (
                <motion.div 
                  key={userProfile.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                >
                  <Link 
                    to={`/profile/${userProfile.username}`}
                    className="flex items-center flex-1"
                  >
                    <Avatar className="h-12 w-12 mr-3">
                      <AvatarImage 
                        src={userProfile.avatar_url || undefined} 
                        alt={userProfile.username}
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-primary/20 text-lg font-bold">
                        {userProfile.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <span className="font-semibold">
                          {userProfile.full_name || userProfile.username}
                        </span>
                        {userProfile.username.toLowerCase() === 'outliersofc' && (
                          <Badge className="ml-2 bg-primary text-primary-foreground px-1 py-0">
                            <CheckCircle className="h-2 w-2 mr-1" />
                            <span className="text-xs">Oficial</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{userProfile.username}</p>
                    </div>
                  </Link>
                  
                  {user && user.id !== userProfile.id && (
                    <Button 
                      variant={userProfile.is_followed ? "outline" : "default"}
                      size="sm"
                      className={userProfile.is_followed ? "border-primary text-primary" : ""}
                      onClick={() => handleFollowToggle(userProfile.id, index)}
                      disabled={!!userProfile.loading}
                    >
                      {userProfile.loading ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                      ) : userProfile.is_followed ? (
                        <UserMinus className="h-3 w-3 mr-1" />
                      ) : (
                        <UserPlus className="h-3 w-3 mr-1" />
                      )}
                      {userProfile.is_followed ? 'Seguindo' : 'Seguir'}
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        <BottomNav />
      </main>
    </PageTransition>
  );
};

export default FollowPage;
