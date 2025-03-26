
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import FollowButton from './FollowButton';

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
  const { user } = useAuth();
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('followers');

  useEffect(() => {
    if (isDialogOpen) {
      if (activeTab === 'followers') {
        fetchFollowers();
      } else {
        fetchFollowing();
      }
    }
  }, [isDialogOpen, activeTab, userId]);

  const fetchFollowers = async () => {
    if (isLoadingFollowers) return;
    
    try {
      setIsLoadingFollowers(true);
      
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles:follower_id (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('following_id', userId);
        
      if (error) throw error;
      
      setFollowers(data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const fetchFollowing = async () => {
    if (isLoadingFollowing) return;
    
    try {
      setIsLoadingFollowing(true);
      
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('follower_id', userId);
        
      if (error) throw error;
      
      setFollowing(data || []);
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="flex gap-2 text-sm cursor-pointer" onClick={() => setIsDialogOpen(true)}>
        <span><strong>{followersCount}</strong> seguidores</span>
        <span><strong>{followingCount}</strong> seguindo</span>
      </div>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conexões de @{username}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="followers" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="followers" className="flex-1">
              Seguidores ({followersCount})
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1">
              Seguindo ({followingCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers">
            {isLoadingFollowers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : followers.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {followers.map(item => (
                  <div key={item.follower_id} className="flex items-center justify-between">
                    <Link 
                      to={`/profile/${item.profiles?.username || 'user'}`} 
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.profiles?.avatar_url || undefined} alt={item.profiles?.username || 'User'} />
                        <AvatarFallback>
                          {item.profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.profiles?.full_name || item.profiles?.username}</p>
                        <p className="text-sm text-muted-foreground">@{item.profiles?.username}</p>
                      </div>
                    </Link>
                    
                    {user && item.follower_id !== user.id && (
                      <FollowButton 
                        targetUserId={item.follower_id} 
                        size="sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum seguidor ainda
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="following">
            {isLoadingFollowing ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : following.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {following.map(item => (
                  <div key={item.following_id} className="flex items-center justify-between">
                    <Link 
                      to={`/profile/${item.profiles?.username || 'user'}`} 
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.profiles?.avatar_url || undefined} alt={item.profiles?.username || 'User'} />
                        <AvatarFallback>
                          {item.profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.profiles?.full_name || item.profiles?.username}</p>
                        <p className="text-sm text-muted-foreground">@{item.profiles?.username}</p>
                      </div>
                    </Link>
                    
                    {user && item.following_id !== user.id && (
                      <FollowButton 
                        targetUserId={item.following_id} 
                        size="sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não está seguindo ninguém ainda
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;
