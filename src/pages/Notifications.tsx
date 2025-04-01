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
import { Bell, Heart, MessageSquare, UserPlus, Activity, Clock, CheckCheck, Loader2 } from 'lucide-react';
import { getUserNotifications } from '@/integrations/supabase/functions';

interface Notification {
  id: string;
  type: string;
  created_at: string;
  read: boolean;
  post_id?: string;
  comment_id?: string;
  actor: {
    id: string;
    username?: string | undefined;
    avatar_url?: string | undefined;
    full_name?: string | undefined;
  };
  post?: {
    id: string;
    content: string;
  };
}

const Notifications: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
        toast.error('Você precisa estar logado para ver notificações');
      } else {
        fetchNotifications();
      }
    }
  }, [user, authLoading, navigate, activeTab]);
  
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Usar função utilitária para buscar notificações
      const data = await getUserNotifications(user.id);
      
      // Filtrar por lido/não lido se necessário
      let filteredData = [...data];
      if (activeTab === 'unread') {
        filteredData = data.filter(notification => !notification.read);
      } else if (activeTab === 'read') {
        filteredData = data.filter(notification => notification.read);
      }
      
      console.log('Notificações carregadas:', filteredData);
      setNotifications(filteredData);
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error);
      setError('Não foi possível carregar suas notificações. Tente novamente mais tarde.');
      toast.error('Erro ao carregar notificações', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      // Atualizar notificações localmente
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error('Erro ao atualizar notificação', {
        description: error.message
      });
    }
  };
  
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);
        
      if (error) throw error;
      
      // Atualizar notificações localmente
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error: any) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      toast.error('Erro ao atualizar notificações', {
        description: error.message
      });
    }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida se não estiver
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navegar para a página apropriada com base no tipo de notificação
    if (notification.post_id) {
      // Adicionar lógica para navegar para o post quando tivermos essa página
      toast.info('Visualização de posts individuais será implementada em breve');
    } else if (notification.type === 'follow') {
      // Navegar para o perfil do usuário que seguiu
      navigate(`/profile/${notification.actor?.username}`);
    }
  };
  
  const getNotificationText = (notification: Notification) => {
    const actor = notification.actor?.username || 'Alguém';
    
    switch (notification.type) {
      case 'like':
        return `${actor} curtiu sua publicação`;
      case 'comment':
        return `${actor} comentou em sua publicação`;
      case 'follow':
        return `${actor} começou a seguir você`;
      case 'comment_like':
        return `${actor} curtiu seu comentário`;
      case 'mention':
        return `${actor} mencionou você em um comentário`;
      default:
        return `Nova notificação de ${actor}`;
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-rose-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'comment_like':
        return <Heart className="h-4 w-4 text-purple-500" />;
      case 'mention':
        return <MessageSquare className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PageTransition>
      <div className="container max-w-md mx-auto pb-20 pt-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Notificações</h1>
          {notifications.some(n => !n.read) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">Não lidas</TabsTrigger>
            <TabsTrigger value="read">Lidas</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchNotifications} 
              className="mt-4"
            >
              Tentar novamente
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Você não tem notificações {activeTab !== 'all' && `${activeTab === 'unread' ? 'não lidas' : 'lidas'}`}</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-1">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3 rounded-lg cursor-pointer ${notification.read ? 'bg-background border border-border' : 'bg-primary/5 border border-primary/20'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={notification.actor?.avatar_url || undefined} 
                        alt={notification.actor?.username || 'Usuário'} 
                      />
                      <AvatarFallback>
                        {notification.actor?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium">{getNotificationText(notification)}</p>
                          {!notification.read && (
                            <Badge variant="default" className="h-2 w-2 rounded-full p-0 bg-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      {notification.post && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {notification.post.content}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      <BottomNav />
    </PageTransition>
  );
};

export default Notifications;
