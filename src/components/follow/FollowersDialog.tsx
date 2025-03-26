
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, UserCheck, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import FollowButton from './FollowButton';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface FollowersDialogProps {
  userId: string;
  username: string;
  followersCount: number;
  followingCount: number;
}

const FollowersDialog: React.FC<FollowersDialogProps> = ({ 
  userId, 
  username,
  followersCount,
  followingCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('followers');
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'followers') {
        fetchFollowers();
      } else {
        fetchFollowing();
      }
    }
  }, [isOpen, activeTab]);

  const fetchFollowers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('following_id', userId);
      
      if (error) throw error;
      
      // Extract profiles from the joined data
      const followerProfiles = data
        .map(item => {
          // Add type check to ensure profiles is not null/undefined and has expected shape
          if (item.profiles && typeof item.profiles === 'object' && 'id' in item.profiles) {
            return item.profiles as UserProfile;
          }
          return null;
        })
        .filter((profile): profile is UserProfile => profile !== null);
      
      setFollowers(followerProfiles);
    } catch (error: any) {
      console.error('Error fetching followers:', error);
      toast.error('Erro ao carregar seguidores', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('follower_id', userId);
      
      if (error) throw error;
      
      // Extract profiles from the joined data
      const followingProfiles = data
        .map(item => {
          // Add type check to ensure profiles is not null/undefined and has expected shape
          if (item.profiles && typeof item.profiles === 'object' && 'id' in item.profiles) {
            return item.profiles as UserProfile;
          }
          return null;
        })
        .filter((profile): profile is UserProfile => profile !== null);
      
      setFollowing(followingProfiles);
    } catch (error: any) {
      console.error('Error fetching following:', error);
      toast.error('Erro ao carregar usuários seguidos', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex gap-4 text-sm cursor-pointer" onClick={() => setIsOpen(true)}>
        <span><strong>{followersCount}</strong> seguidores</span>
        <span><strong>{followingCount}</strong> seguindo</span>
      </div>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">@{username}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="followers" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              <User className="h-4 w-4 mr-2" />
              Seguidores ({followersCount})
            </TabsTrigger>
            <TabsTrigger value="following">
              <UserCheck className="h-4 w-4 mr-2" />
              Seguindo ({followingCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="pt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : followers.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto px-1">
                {followers.map(follower => (
                  <div key={follower.id} className="flex items-center justify-between">
                    <Link to={`/profile/${follower.username}`} className="flex items-center gap-3 flex-1" onClick={() => setIsOpen(false)}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={follower.avatar_url || undefined} alt={follower.username} />
                        <AvatarFallback className="bg-primary/20">
                          {follower.username[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{follower.full_name || follower.username}</p>
                        <p className="text-xs text-muted-foreground">@{follower.username}</p>
                      </div>
                    </Link>
                    <FollowButton targetUserId={follower.id} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserX className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Nenhum seguidor ainda</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="following" className="pt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : following.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto px-1">
                {following.map(follow => (
                  <div key={follow.id} className="flex items-center justify-between">
                    <Link to={`/profile/${follow.username}`} className="flex items-center gap-3 flex-1" onClick={() => setIsOpen(false)}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={follow.avatar_url || undefined} alt={follow.username} />
                        <AvatarFallback className="bg-primary/20">
                          {follow.username[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{follow.full_name || follow.username}</p>
                        <p className="text-xs text-muted-foreground">@{follow.username}</p>
                      </div>
                    </Link>
                    <FollowButton targetUserId={follow.id} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserX className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Não está seguindo ninguém ainda</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;
