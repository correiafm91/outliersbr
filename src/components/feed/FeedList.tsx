
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Post from './Post';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import { getPostsWithProfiles, getUserLikedPostIds } from '@/integrations/supabase/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PostType {
  id: string;
  content: string;
  images: string[] | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  likes: number;
  comments: number;
  has_liked: boolean;
}

interface FeedListProps {
  onLoadStateChange?: (isLoaded: boolean) => void;
}

const FeedList: React.FC<FeedListProps> = ({ onLoadStateChange }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Definir um limite máximo de tentativas
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingHelp(true);
      }, 1500); // Reduzido de 2000 para 1500 ms para feedback mais rápido
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingHelp(false);
    }
  }, [isLoading]);

  const fetchPosts = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      setLoadError("Não foi possível carregar os dados após várias tentativas. Por favor, tente novamente mais tarde.");
      setIsLoading(false);
      if (onLoadStateChange) onLoadStateChange(true);
      return;
    }

    try {
      console.log('FeedList: Iniciando busca de posts');
      setIsLoading(true);
      setLoadError(null);
      if (onLoadStateChange) onLoadStateChange(false);

      // Definir um timeout de 10 segundos
      let postsData: any[] = [];
      
      try {
        // Buscar posts com limite e paginação
        postsData = await getPostsWithProfiles(20, page);
      } catch (error: any) {
        console.error('Erro na busca de posts:', error);
        throw new Error('A conexão expirou, tente novamente');
      }
      
      console.log('FeedList: Dados de posts recebidos:', { 
        postCount: postsData?.length || 0,
        success: !!postsData 
      });

      // Se não há posts ainda, retornar cedo
      if (!postsData || postsData.length === 0) {
        if (page === 0) {
          setPosts([]);
        }
        setHasMore(false);
        setIsLoading(false);
        if (onLoadStateChange) onLoadStateChange(true);
        return;
      }

      // Se o usuário estiver logado, verificar quais posts ele curtiu
      let enhancedPosts = [...postsData];
      
      if (user) {
        console.log('FeedList: Buscando posts curtidos pelo usuário');
        const likedPostIds = await getUserLikedPostIds(user.id);
        console.log('FeedList: Usuário curtiu', likedPostIds.length, 'posts');
        
        enhancedPosts = postsData.map(post => ({
          ...post,
          has_liked: likedPostIds.includes(post.id)
        }));
      }

      // Atualizar o estado com os novos posts
      if (page === 0) {
        setPosts(enhancedPosts);
      } else {
        setPosts(prev => [...prev, ...enhancedPosts]);
      }
      
      setHasMore(enhancedPosts.length === 20); // Se retornou menos de 20, não há mais
      setRetryCount(0); // Resetar contagem de tentativas ao ter sucesso
      console.log('FeedList: Processamento de posts completo');
    } catch (error: any) {
      console.error('Erro ao buscar posts:', error);
      setLoadError(`Erro ao carregar publicações: ${error.message}`);
      
      // Incrementar contagem de tentativas e tentar novamente após um atraso
      setRetryCount(prev => prev + 1);
      
      if (retryCount < MAX_RETRIES - 1) {
        // Esperar mais tempo entre as tentativas
        const retryDelay = 1000 * (retryCount + 1);
        setTimeout(() => {
          console.log(`Tentando buscar novamente (tentativa ${retryCount + 1})`);
          setRefreshKey(prev => prev + 1);
        }, retryDelay);
      } else {
        toast.error('Não foi possível carregar as publicações', {
          description: 'Tente recarregar a página',
        });
      }
    } finally {
      setIsLoading(false);
      if (onLoadStateChange) onLoadStateChange(true);
      console.log('FeedList: Estado de carregamento definido como false');
    }
  }, [user, onLoadStateChange, retryCount, page, MAX_RETRIES]);

  // Disparar atualização de posts
  const refreshPosts = useCallback(() => {
    setPage(0); // Voltar para a primeira página
    setRetryCount(0); // Resetar contagem de tentativas na atualização manual
    setRefreshKey(prev => prev + 1);
  }, []);

  // Carregar mais posts
  const loadMorePosts = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoading, hasMore]);

  useEffect(() => {
    fetchPosts();
  }, [refreshKey, fetchPosts, page]);

  const handleRetry = () => {
    setShowLoadingHelp(false);
    refreshPosts();
  };

  // Memorizar componentes de post para reduzir re-renderizações
  const postComponents = useMemo(() => {
    if (posts.length === 0) return null;
    
    return posts.map((post, index) => (
      <motion.div
        key={post.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.5) }} // Limitar o atraso para melhor desempenho
      >
        <Post 
          id={post.id}
          author={{
            name: post.profiles.full_name || post.profiles.username,
            username: post.profiles.username,
            avatar: post.profiles.avatar_url || 'https://via.placeholder.com/150',
            verified: post.profiles.username?.toLowerCase() === 'outliersofc'
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
          likes={post.likes}
          comments={post.comments}
          hasLiked={post.has_liked}
          onRefresh={refreshPosts}
        />
      </motion.div>
    ));
  }, [posts, refreshPosts]);

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-center">Carregando publicações...</p>
        
        {(showLoadingHelp || loadError) && (
          <div className="mt-4 max-w-md text-center">
            <Alert variant="default" className="bg-background border-primary/50">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle className="text-foreground">
                {loadError ? 'Ocorreu um erro' : 'Está demorando mais que o esperado'}
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {loadError || 'O sistema pode estar enfrentando dificuldades de conexão. Tente novamente.'}
              </AlertDescription>
              <Button 
                size="sm" 
                className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleRetry}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </Alert>
          </div>
        )}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl mx-auto text-center py-10"
      >
        <p className="text-muted-foreground">Nenhuma publicação encontrada.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Seja o primeiro a compartilhar conteúdo com a comunidade!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="space-y-4">
        {postComponents}
        
        {hasMore && (
          <div className="flex justify-center py-4">
            <Button 
              variant="outline"
              onClick={loadMorePosts}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Carregar mais"
              )}
            </Button>
          </div>
        )}
        
        {isLoading && posts.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FeedList;
