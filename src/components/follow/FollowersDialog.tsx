
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { UserPlus, Users } from 'lucide-react';
import FollowButton from './FollowButton';

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
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('followers');
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFollowData(activeTab);
    }
  }, [userId, open, activeTab]);

  const fetchFollowData = async (tab: string) => {
    setIsLoading(true);
    try {
      if (tab === 'followers') {
        // Get users who follow this user
        const { data, error } = await supabase
          .from('follows')
          .select(`
            follower_id,
            profiles!follows_follower_id_fkey (
              id, username, full_name, avatar_url
            )
          `)
          .eq('following_id', userId);

        if (error) throw error;
        
        // Extract profile data from the nested structure
        const followerProfiles = data.map(item => item.profiles) as UserProfile[];
        setFollowers(followerProfiles);
      } else {
        // Get users this user follows
        const { data, error } = await supabase
          .from('follows')
          .select(`
            following_id,
            profiles!follows_following_id_fkey (
              id, username, full_name, avatar_url
            )
          `)
          .eq('follower_id', userId);

        if (error) throw error;
        
        // Extract profile data from the nested structure
        const followingProfiles = data.map(item => item.profiles) as UserProfile[];
        setFollowing(followingProfiles);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex gap-4">
        <DialogTrigger asChild>
          <button 
            className="text-sm hover:underline" 
            onClick={() => setActiveTab('followers')}
          >
            <strong>{followersCount}</strong> seguidores
          </button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <button 
            className="text-sm hover:underline" 
            onClick={() => setActiveTab('following')}
          >
            <strong>{followingCount}</strong> seguindo
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="mb-4">@{username}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="followers" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Seguidores ({followersCount})
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" />
              Seguindo ({followingCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-16" />
                </div>
              ))
            ) : followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum seguidor ainda</p>
              </div>
            ) : (
              followers.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg">
                  <Link 
                    to={`/profile/${profile.username}`}
                    className="flex items-center gap-3"
                    onClick={() => setOpen(false)}
                  >
                    <Avatar>
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.username[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{profile.full_name || profile.username}</p>
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    </div>
                  </Link>
                  <FollowButton targetUserId={profile.id} variant="outline" size="sm" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-4 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-16" />
                </div>
              ))
            ) : following.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Não está seguindo ninguém ainda</p>
              </div>
            ) : (
              following.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg">
                  <Link 
                    to={`/profile/${profile.username}`}
                    className="flex items-center gap-3"
                    onClick={() => setOpen(false)}
                  >
                    <Avatar>
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.username[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{profile.full_name || profile.username}</p>
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    </div>
                  </Link>
                  <FollowButton targetUserId={profile.id} variant="outline" size="sm" />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;
