
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, ThumbsUp, MessageSquare, Link, Activity, Clock, CheckCircle, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow';
  created_at: string;
  post_id?: string;
  post_content?: string;
  from_user: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  is_read: boolean;
}

const Notifications: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else {
        fetchNotifications();
      }
    }
  }, [user, authLoading, navigate]);
  
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      
      // For now, we'll simulate notifications based on likes and comments
      // In a real implementation, you would have a dedicated notifications table
      
      // Get user's posts
      const { data: userPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, content')
        .eq('user_id', user?.id);
        
      if (postsError) throw postsError;
      
      if (!userPosts || userPosts.length === 0) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }
      
      const postIds = userPosts.map(post => post.id);
      const postContents = userPosts.reduce((acc, post) => {
        acc[post.id] = post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');
        return acc;
      }, {} as Record<string, string>);
      
      // Get likes notifications
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select(`
          id,
          created_at,
          post_id,
          user_id
        `)
        .in('post_id', postIds)
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (likesError) throw likesError;
      
      // Get comments notifications
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          created_at,
          post_id,
          user_id,
          content
        `)
        .in('post_id', postIds)
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (commentsError) throw commentsError;
      
      // Get user profiles for these notifications
      const userIds = [
        ...(likes || []).map(like => like.user_id),
        ...(comments || []).map(comment => comment.user_id)
      ];
      
      if (userIds.length === 0) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map for quicker lookup
      const profilesMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Format notifications
      const likeNotifications = (likes || []).map(like => {
        const userProfile = profilesMap[like.user_id] || {
          username: 'usuário',
          avatar_url: null,
          full_name: null
        };
        
        return {
          id: `like-${like.id}`,
          type: 'like' as const,
          created_at: like.created_at,
          post_id: like.post_id,
          post_content: postContents[like.post_id],
          from_user: {
            username: userProfile.username,
            avatar_url: userProfile.avatar_url,
            full_name: userProfile.full_name
          },
          is_read: false // In a real app, you'd track read status
        };
      });
      
      const commentNotifications = (comments || []).map(comment => {
        const userProfile = profilesMap[comment.user_id] || {
          username: 'usuário',
          avatar_url: null,
          full_name: null
        };
        
        return {
          id: `comment-${comment.id}`,
          type: 'comment' as const,
          created_at: comment.created_at,
          post_id: comment.post_id,
          post_content: postContents[comment.post_id],
          comment_content: comment.content,
          from_user: {
            username: userProfile.username,
            avatar_url: userProfile.avatar_url,
            full_name: userProfile.full_name
          },
          is_read: false // In a real app, you'd track read status
        };
      });
      
      // Combine and sort by date
      const allNotifications = [
        ...likeNotifications,
        ...commentNotifications
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setNotifications(allNotifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
  };
  
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
      return `${diffSecs}s`;
    } else if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-background text-foreground">
        <div className="max-w-xl mx-auto px-4 pt-6">
          <h1 className="text-3xl font-bold mb-6">Notificações</h1>
          
          <Tabs defaultValue="all">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                <Bell className="h-4 w-4 mr-2" />
                Todas
              </TabsTrigger>
              <TabsTrigger value="mentions" className="flex-1">
                <Activity className="h-4 w-4 mr-2" />
                Menções
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                  <p className="mt-4 text-muted-foreground">Nenhuma notificação</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Quando alguém curtir ou comentar em suas publicações, você verá aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border border-border flex gap-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                        !notification.is_read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={notification.from_user.avatar_url || undefined} 
                            alt={notification.from_user.username} 
                          />
                          <AvatarFallback>
                            {notification.from_user.username ? notification.from_user.username[0].toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {notification.from_user.full_name || notification.from_user.username}
                          </span>
                          {notification.from_user.username.toLowerCase() === 'outliersofc' && (
                            <Badge variant="outline" className="px-1 bg-primary text-primary-foreground">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Oficial
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm mt-1">
                          {notification.type === 'like' && (
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                              curtiu sua publicação
                            </span>
                          )}
                          {notification.type === 'comment' && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5 text-primary" />
                              comentou em sua publicação
                            </span>
                          )}
                        </p>
                        
                        {notification.post_content && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {notification.post_content}
                          </p>
                        )}
                        
                        <div className="flex items-center mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTimeAgo(notification.created_at)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="mentions" className="mt-4">
              <div className="text-center py-10">
                <Activity className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                <p className="mt-4 text-muted-foreground">Nenhuma menção</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Quando alguém mencionar você nas publicações, você verá aqui.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <BottomNav />
      </main>
    </PageTransition>
  );
};

export default Notifications;
