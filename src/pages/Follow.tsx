
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFollowers, getFollowing } from '@/integrations/supabase/functions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Loader2, UserPlus, UserMinus, CheckCircle } from 'lucide-react';
import { isFollowingUser, followUser, unfollowUser } from '@/integrations/supabase/functions';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const FollowPage = () => {
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [isLoadingFollow, setIsLoadingFollow] = useState<Record<string, boolean>>({});

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['follow', type, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return type === 'followers' 
        ? getFollowers(user.id)
        : getFollowing(user.id);
    },
    enabled: !!user?.id,
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        {type === 'followers' ? 'Seguidores' : 'Seguindo'}
      </h1>
      
      <div className="space-y-4">
        {profiles?.map((profile) => (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <Link to={`/profile/${profile.username}`} className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {profile.full_name || profile.username}
                  </span>
                  {profile.username?.toLowerCase() === 'outliersofc' && (
                    <CheckCircle className="w-4 h-4 text-primary fill-primary" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  @{profile.username}
                </span>
              </div>
            </Link>

            {user?.id !== profile.id && (
              <Button
                size="sm"
                variant={followingStatus[profile.id] ? "secondary" : "default"}
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
          <div className="text-center text-muted-foreground p-8">
            {type === 'followers' 
              ? 'Nenhum seguidor ainda'
              : 'Não está seguindo ninguém ainda'}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowPage;
