
import { supabase } from './client';

// Helpers otimizados para buscar dados e gerenciar o cache

// Cache para perfis de usuários
const profileCache = new Map();
const profileExpiryTime = 5 * 60 * 1000; // 5 minutos

export async function getProfileByUserId(userId: string) {
  try {
    // Verificar cache primeiro
    const cachedProfile = profileCache.get(userId);
    if (cachedProfile && cachedProfile.expiryTime > Date.now()) {
      return cachedProfile.data;
    }
    
    // Buscar do banco de dados
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    // Atualizar cache
    profileCache.set(userId, {
      data,
      expiryTime: Date.now() + profileExpiryTime
    });
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }
}

// Função auxiliar para verificar se um usuário curtiu um post
export async function hasUserLikedPost(userId: string, postId: string): Promise<boolean> {
  if (!userId || !postId) return false;
  
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
      
    if (error) throw error;
    
    return !!data;
  } catch (error) {
    console.error('Erro ao verificar status de curtida:', error);
    return false;
  }
}

// Função auxiliar para contar curtidas de um post
export async function getLikesCountForPost(postId: string): Promise<number> {
  if (!postId) return 0;
  
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar curtidas:', error);
    return 0;
  }
}

// Função auxiliar para contar comentários de um post
export async function getCommentsCountForPost(postId: string): Promise<number> {
  if (!postId) return 0;
  
  try {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar comentários:', error);
    return 0;
  }
}

// Função para obter posts com dados de perfil
export async function getPostsWithProfiles(limit = 20, page = 0) {
  try {
    console.log('Iniciando busca de posts com perfis');
    
    // Definir um timeout para evitar que a requisição fique pendente indefinidamente
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    // Buscar posts com paginação
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    clearTimeout(timeoutId);
    
    if (postsError) throw postsError;
    
    if (!posts || posts.length === 0) {
      return [];
    }
    
    console.log(`Encontrados ${posts.length} posts`);
    
    // Obter IDs de usuários únicos dos posts
    const userIds = [...new Set(posts.map(post => post.user_id))];
    
    // Buscar perfis dos usuários
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .in('id', userIds);
      
    if (profilesError) throw profilesError;
    
    // Criar um mapa para busca rápida
    const profilesMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);
    
    // Buscar contagem de curtidas e comentários em paralelo
    const postIds = posts.map(post => post.id);
    const [likesCounts, commentsCounts] = await Promise.all([
      Promise.all(postIds.map(id => getLikesCountForPost(id))),
      Promise.all(postIds.map(id => getCommentsCountForPost(id)))
    ]);
    
    // Combinar todos os dados
    const enhancedPosts = posts.map((post, index) => {
      const profile = profilesMap[post.user_id] || {
        username: 'usuário',
        avatar_url: null,
        full_name: null
      };
      
      return {
        ...post,
        profiles: {
          username: profile.username,
          avatar_url: profile.avatar_url,
          full_name: profile.full_name
        },
        likes: likesCounts[index] || 0,
        comments: commentsCounts[index] || 0,
        has_liked: false // Será definido separadamente para usuários logados
      };
    });
    
    return enhancedPosts;
  } catch (error) {
    console.error('Erro ao buscar posts com perfis:', error);
    throw new Error('Não foi possível carregar os posts. Tente novamente mais tarde.');
  }
}

// Função para obter posts curtidos por um usuário
export async function getUserLikedPostIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);
      
    if (error) throw error;
    
    return (data || []).map(like => like.post_id);
  } catch (error) {
    console.error('Erro ao buscar posts curtidos pelo usuário:', error);
    return [];
  }
}

// Função para verificar se um usuário curtiu um comentário
export async function hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
  if (!userId || !commentId) return false;
  
  try {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .maybeSingle();
      
    if (error) throw error;
    
    return !!data;
  } catch (error) {
    console.error('Erro ao verificar status de curtida de comentário:', error);
    return false;
  }
}

// Função para criar notificação
export async function createNotification(
  type: string,
  userId: string,
  actorId: string,
  postId?: string,
  commentId?: string
): Promise<boolean> {
  if (!userId || !actorId || userId === actorId) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        type,
        user_id: userId,
        actor_id: actorId,
        post_id: postId,
        comment_id: commentId,
        read: false
      });
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return false;
  }
}

// Função para obter posts de um usuário específico
export async function getPostsByUserId(userId: string, limit = 20, page = 0) {
  if (!userId) return [];
  
  try {
    console.log('Buscando posts para userId:', userId);
    
    // Buscar posts deste usuário com paginação
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    if (postsError) throw postsError;
    
    if (!posts || posts.length === 0) {
      return [];
    }
    
    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) throw profileError;
    
    // Contar curtidas e comentários para cada post
    const postIds = posts.map(post => post.id);
    const [likesCounts, commentsCounts] = await Promise.all([
      Promise.all(postIds.map(id => getLikesCountForPost(id))),
      Promise.all(postIds.map(id => getCommentsCountForPost(id)))
    ]);
    
    // Combinar tudo
    const enhancedPosts = posts.map((post, index) => {
      return {
        ...post,
        profiles: {
          username: profile?.username || 'usuário',
          avatar_url: profile?.avatar_url || null,
          full_name: profile?.full_name || null
        },
        likes: likesCounts[index] || 0,
        comments: commentsCounts[index] || 0,
        has_liked: false // Será definido separadamente para usuários logados
      };
    });
    
    return enhancedPosts;
  } catch (error) {
    console.error('Erro ao buscar posts do usuário:', error);
    return [];
  }
}

// Função para obter posts salvos de um usuário
export async function getSavedPostsByUserId(userId: string, limit = 20, page = 0) {
  if (!userId) return [];
  
  try {
    console.log('Buscando posts salvos para userId:', userId);
    
    // Buscar IDs de posts salvos para este usuário com paginação
    const { data: savedPosts, error: savedPostsError } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    if (savedPostsError) throw savedPostsError;
    
    if (!savedPosts || savedPosts.length === 0) {
      return [];
    }
    
    // Extrair IDs de posts
    const postIds = savedPosts.map(item => item.post_id);
    
    // Buscar os posts salvos
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);
      
    if (postsError) throw postsError;
    
    if (!posts || posts.length === 0) {
      return [];
    }
    
    // Obter IDs de usuários únicos dos posts
    const userIds = [...new Set(posts.map(post => post.user_id))];
    
    // Buscar perfis dos usuários
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .in('id', userIds);
      
    if (profilesError) throw profilesError;
    
    // Criar um mapa para busca rápida
    const profilesMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);
    
    // Buscar contagem de curtidas e comentários em paralelo
    const [likesCounts, commentsCounts] = await Promise.all([
      Promise.all(postIds.map(id => getLikesCountForPost(id))),
      Promise.all(postIds.map(id => getCommentsCountForPost(id)))
    ]);
    
    // Combinar todos os dados
    const enhancedPosts = posts.map((post, index) => {
      const profile = profilesMap[post.user_id] || {
        username: 'usuário',
        avatar_url: null,
        full_name: null
      };
      
      return {
        ...post,
        profiles: {
          username: profile.username,
          avatar_url: profile.avatar_url,
          full_name: profile.full_name
        },
        likes: likesCounts[index] || 0,
        comments: commentsCounts[index] || 0,
        has_liked: false // Será definido separadamente para usuários logados
      };
    });
    
    return enhancedPosts;
  } catch (error) {
    console.error('Erro ao buscar posts salvos do usuário:', error);
    return [];
  }
}

// Funções para contagem de seguidores
export async function getFollowerCountForUser(userId: string): Promise<number> {
  if (!userId) return 0;
  
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar seguidores:', error);
    return 0;
  }
}

export async function getFollowingCountForUser(userId: string): Promise<number> {
  if (!userId) return 0;
  
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar seguindo:', error);
    return 0;
  }
}
