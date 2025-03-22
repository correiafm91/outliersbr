
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    } else if (user) {
      fetchNotifications();
    }
  }, [user, isLoading, navigate]);

  const fetchNotifications = async () => {
    try {
      setIsNotificationsLoading(true);
      
      // For demo purposes, we'll simulate notifications based on likes and comments
      // In a real app, you'd create a dedicated notifications table
      
      // Get all likes on the user's posts
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select(`
          id,
          created_at,
          user_id,
          post_id,
          posts:post_id(content, user_id),
          profiles:user_id(username, avatar_url, full_name)
        `)
        .eq('posts.user_id', user?.id)
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (likesError) throw likesError;
      
      // Get all comments on the user's posts
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          created_at,
          user_id,
          post_id,
          content,
          posts:post_id(content, user_id),
          profiles:user_id(username, avatar_url, full_name)
        `)
        .eq('posts.user_id', user?.id)
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (commentsError) throw commentsError;
      
      // Transform likes into notifications
      const likeNotifications = (likesData || [])
        .filter(like => like.posts?.user_id === user?.id)
        .map(like => ({
          id: `like_${like.id}`,
          type: 'like' as 'like',
          created_at: like.created_at,
          post_id: like.post_id,
          post_content: like.posts?.content,
          from_user: like.profiles,
          is_read: false
        }));
      
      // Transform comments into notifications
      const commentNotifications = (commentsData || [])
        .filter(comment => comment.posts?.user_id === user?.id)
        .map(comment => ({
          id: `comment_${comment.id}`,
          type: 'comment' as 'comment',
          created_at: comment.created_at,
          post_id: comment.post_id,
          post_content: comment.posts?.content,
          from_user: comment.profiles,
          is_read: false
        }));
      
      // Combine and sort notifications
      const allNotifications = [...likeNotifications, ...commentNotifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setNotifications(allNotifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações', {
        description: error.message,
      });
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
  };

  if (isLoading || isNotificationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-background text-foreground">
        <div className="page-container px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold mt-8 mb-2 text-foreground">Notificações</h1>
            <p className="text-muted-foreground">Acompanhe as interações na plataforma</p>
          </motion.div>
          
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Você não tem notificações no momento.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    notification.is_read ? "opacity-80" : ""
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={notification.from_user.avatar_url || undefined} 
                      alt={notification.from_user.username} 
                    />
                    <AvatarFallback>
                      {notification.from_user.username ? notification.from_user.username[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        {notification.type === 'like' && (
                          <Heart className="h-4 w-4 text-rose-500" />
                        )}
                        {notification.type === 'comment' && (
                          <MessageCircle className="h-4 w-4 text-primary" />
                        )}
                        {notification.type === 'follow' && (
                          <UserPlus className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">
                            {notification.from_user.full_name || notification.from_user.username}
                          </span>{' '}
                          {notification.type === 'like' && 'curtiu a sua publicação.'}
                          {notification.type === 'comment' && 'comentou na sua publicação.'}
                          {notification.type === 'follow' && 'começou a te seguir.'}
                        </p>
                        {notification.post_content && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            "{notification.post_content}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
        <BottomNav />
      </main>
    </PageTransition>
  );
};

export default Notifications;
