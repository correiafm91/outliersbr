
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFollowers, getFollowing, isFollowingUser, followUser, unfollowUser } from '@/integrations/supabase/functions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Loader2, UserPlus, UserMinus, CheckCircle, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { getProfileByUsername } from '@/integrations/supabase/functions';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';

const FollowPage = () => {
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [isLoadingFollow, setIsLoadingFollow] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  
  // Get username from query params if any
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const usernameParam = searchParams.get('username');
  
  // State to track profile of the user whose followers/following we're viewing
  const [targetProfile, setTargetProfile] = useState<{ id: string; username: string } | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Get the target profile based on username param or default to current user
  useEffect(() => {
    const getTargetProfile = async () => {
      if (usernameParam) {
        setIsProfileLoading(true);
        try {
          const profile = await getProfileByUsername(usernameParam);
          if (profile) {
            setTargetProfile({ id: profile.id, username: profile.username });
          } else {
            toast.error('Perfil não encontrado');
            navigate('/');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast.error('Erro ao carregar perfil');
        } finally {
          setIsProfileLoading(false);
        }
      } else if (user) {
        setTargetProfile({ id: user.id, username: '' });
      }
    };

    getTargetProfile();
  }, [usernameParam, user, navigate]);

  // Fetch followers or following for the target profile
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['follow', type, targetProfile?.id],
    queryFn: async () => {
      if (!targetProfile?.id) return [];
      return type === 'followers' 
        ? getFollowers(targetProfile.id)
        : getFollowing(targetProfile.id);
    },
    enabled: !!targetProfile?.id,
  });

  // When profiles change, check their following status
  useEffect(() => {
    if (profiles && user) {
      profiles.forEach(profile => {
        checkFollowingStatus(profile.id);
      });
    }
  }, [profiles, user]);

  // Check following status for each profile
  const checkFollowingStatus = async (profileId: string) => {
    if (!user) return;
    const isFollowing = await isFollowingUser(profileId);
    setFollowingStatus(prev => ({ ...prev, [profileId]: isFollowing }));
  };

  // Handle follow/unfollow
  const handleFollowToggle = async (profileId: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para seguir usuários');
      return;
    }

    setIsLoadingFollow(prev => ({ ...prev, [profileId]: true }));
    try {
      const isFollowing = followingStatus[profileId];
      const success = isFollowing 
        ? await unfollowUser(profileId)
        : await followUser(profileId);

      if (success) {
        setFollowingStatus(prev => ({ ...prev, [profileId]: !isFollowing }));
        toast.success(isFollowing ? 'Deixou de seguir' : 'Seguindo');
      } else {
        throw new Error('Falha ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status de seguir');
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoadingFollow(prev => ({ ...prev, [profileId]: false }));
    }
  };

  if (isProfileLoading || isLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container max-w-2xl mx-auto p-4 min-h-screen bg-black text-white pb-20">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {type === 'followers' ? 'Seguidores' : 'Seguindo'}
            {targetProfile && usernameParam && (
              <span className="text-lg font-normal ml-2">
                de @{targetProfile.username}
              </span>
            )}
          </h1>
        </div>
        
        <div className="space-y-4">
          {profiles?.map((profile) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900"
            >
              <Link to={`/profile/${profile.username}`} className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-gray-700">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                  <AvatarFallback>
                    {profile.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-white">
                      {profile.full_name || profile.username}
                    </span>
                    {profile.username?.toLowerCase() === 'outliersofc' && (
                      <CheckCircle className="w-4 h-4 text-primary fill-primary" />
                    )}
                  </div>
                  <span className="text-sm text-gray-400">
                    @{profile.username}
                  </span>
                </div>
              </Link>

              {user?.id !== profile.id && (
                <Button
                  size="sm"
                  variant={followingStatus[profile.id] ? "outline" : "default"}
                  className={followingStatus[profile.id] ? "border-primary text-primary" : ""}
                  onClick={() => handleFollowToggle(profile.id)}
                  disabled={isLoadingFollow[profile.id]}
                >
                  {isLoadingFollow[profile.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : followingStatus[profile.id] ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-1" />
                      Seguindo
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Seguir
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          ))}

          {profiles?.length === 0 && (
            <div className="text-center text-gray-400 p-8">
              {type === 'followers' 
                ? 'Nenhum seguidor ainda'
                : 'Não está seguindo ninguém ainda'}
            </div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default FollowPage;
