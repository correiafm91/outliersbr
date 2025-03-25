
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSavedPosts } from '@/integrations/supabase/functions';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCcw, AlertCircle, BookmarkIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import Post from '@/components/feed/Post';
import { motion } from 'framer-motion';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';

const SavedPostsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);

  const { data: savedPosts, isLoading, error } = useQuery({
    queryKey: ['savedPosts', user?.id, refreshKey],
    queryFn: async () => {
      if (!user) return [];
      return getSavedPosts(user.id);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingHelp(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingHelp(false);
    }
  }, [isLoading]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setShowLoadingHelp(false);
    toast.success('Atualizando posts salvos...');
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
          <Loader2 className="w-6 h-6 animate-spin mb-4" />
          <p className="text-muted-foreground text-center">Carregando posts salvos...</p>
          
          {showLoadingHelp && (
            <div className="mt-8 max-w-md text-center">
              <Alert variant="default" className="bg-background border-primary/50">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="text-foreground">
                  Está demorando mais que o esperado
                </AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  O sistema pode estar enfrentando dificuldades de conexão. Tente recarregar.
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
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="container max-w-2xl mx-auto p-4 min-h-screen bg-black text-white pb-20">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>
              Ocorreu um erro ao carregar os posts salvos. Tente novamente mais tarde.
            </AlertDescription>
            <Button 
              size="sm" 
              className="mt-2"
              onClick={handleRefresh}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          </Alert>
          <BottomNav />
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
          <h1 className="text-2xl font-bold">Posts Salvos</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto" 
            onClick={handleRefresh}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>

        {savedPosts && savedPosts.length > 0 ? (
          <div className="space-y-4">
            {savedPosts.map((post: any, index: number) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Post 
                  id={post.id}
                  author={{
                    name: post.profiles?.full_name || post.profiles?.username || 'Usuário',
                    username: post.profiles?.username || 'usuario',
                    avatar: post.profiles?.avatar_url || 'https://via.placeholder.com/150',
                    verified: post.profiles?.username?.toLowerCase() === 'outliersofc'
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
                  likes={0} // These will be fetched within the Post component
                  comments={0}
                  hasLiked={false}
                  onRefresh={() => setRefreshKey(prev => prev + 1)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <BookmarkIcon className="h-12 w-12 text-gray-500 mb-4" />
            <h2 className="text-xl font-medium mb-2">Nenhum post salvo</h2>
            <p className="text-gray-400 max-w-md">
              Quando você salvar posts, eles aparecerão aqui para que você possa encontrá-los facilmente.
            </p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => navigate('/')}
            >
              Explorar feed
            </Button>
          </div>
        )}
        
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default SavedPostsPage;
