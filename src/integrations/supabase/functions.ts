import { supabase } from './client';

// Helper function to get profile data by user ID with caching
const profileCache = new Map();
const profileCacheExpiry = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getProfileByUserId(userId: string) {
  try {
    // Check cache first
    const now = Date.now();
    const cachedProfile = profileCache.get(userId);
    const cacheExpiry = profileCacheExpiry.get(userId);
    
    if (cachedProfile && cacheExpiry && now < cacheExpiry) {
      return cachedProfile;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    // Update cache
    profileCache.set(userId, data);
    profileCacheExpiry.set(userId, now + CACHE_DURATION);
    
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Batched query helpers to reduce number of requests
// Corrigindo o problema de tipo infinito usando uma união literal explícita
export async function batchedQuery<T = any>(
  table: 'comments' | 'posts' | 'comment_likes' | 'follows' | 'likes' | 'notifications' | 'profiles' | 'saved_posts',
  column: string, 
  values: any[], 
  select: string = '*'
): Promise<T[]> {
  // Split into chunks of 100 for better performance
  const chunkSize = 100;
  const uniqueValues = [...new Set(values)];
  const chunks = [];
  
  for (let i = 0; i < uniqueValues.length; i += chunkSize) {
    chunks.push(uniqueValues.slice(i, i + chunkSize));
  }
  
  const results = [];
  
  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in(column, chunk);
      
    if (error) throw error;
    if (data) results.push(...data);
  }
  
  return results;
}

// Helper function to get post count for a user
export async function getPostCountForUser(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting posts:', error);
    return 0;
  }
}

// Helper function to check if a user has liked a post
export async function hasUserLikedPost(userId: string, postId: string): Promise<boolean> {
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
    console.error('Error checking like status:', error);
    return false;
  }
}

// Helper function to get likes count for a post - with caching
const likesCountCache = new Map();
const likesCountExpiry = new Map();
const LIKES_CACHE_DURATION = 60 * 1000; // 1 minute

export async function getLikesCountForPost(postId: string): Promise<number> {
  try {
    const now = Date.now();
    const cachedCount = likesCountCache.get(postId);
    const cacheExpiry = likesCountExpiry.get(postId);
    
    if (cachedCount !== undefined && cacheExpiry && now < cacheExpiry) {
      return cachedCount;
    }
    
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
      
    if (error) throw error;
    
    // Update cache
    likesCountCache.set(postId, count || 0);
    likesCountExpiry.set(postId, now + LIKES_CACHE_DURATION);
    
    return count || 0;
  } catch (error) {
    console.error('Error counting likes:', error);
    return 0;
  }
}

// Helper function to get comments count for a post - with caching
const commentsCountCache = new Map();
const commentsCountExpiry = new Map();
const COMMENTS_CACHE_DURATION = 60 * 1000; // 1 minute

export async function getCommentsCountForPost(postId: string): Promise<number> {
  try {
    const now = Date.now();
    const cachedCount = commentsCountCache.get(postId);
    const cacheExpiry = commentsCountExpiry.get(postId);
    
    if (cachedCount !== undefined && cacheExpiry && now < cacheExpiry) {
      return cachedCount;
    }
    
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
      
    if (error) throw error;
    
    // Update cache
    commentsCountCache.set(postId, count || 0);
    commentsCountExpiry.set(postId, now + COMMENTS_CACHE_DURATION);
    
    return count || 0;
  } catch (error) {
    console.error('Error counting comments:', error);
    return 0;
  }
}

// Helper function to get posts with profile data - optimized with caching and parallel requests
const postsCache = {
  data: null as any[] | null,
  expiry: 0,
  loading: false,
  lastError: null as Error | null,
  errorCount: 0,
  lastErrorTime: 0
};
const POSTS_CACHE_DURATION = 60 * 1000; // Increased to 60 seconds
const ERROR_RESET_TIME = 5 * 60 * 1000; // 5 minutes to reset error count

export async function getPostsWithProfiles() {
  try {
    const now = Date.now();
    console.log('Starting getPostsWithProfiles function');
    
    // Check if we need to reset error counter
    if (postsCache.errorCount > 0 && (now - postsCache.lastErrorTime) > ERROR_RESET_TIME) {
      postsCache.errorCount = 0;
      postsCache.lastError = null;
    }
    
    // If too many errors recently, add exponential backoff
    if (postsCache.errorCount > 3) {
      const backoffTime = Math.min(Math.pow(2, postsCache.errorCount - 3) * 1000, 60000); // Max 1 minute backoff
      console.log(`Too many errors recently, backing off for ${backoffTime}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
    
    // Return cached data if available and not expired
    if (postsCache.data && now < postsCache.expiry && !postsCache.loading) {
      console.log('Returning cached posts data');
      return postsCache.data;
    }
    
    // If already loading, wait for it to complete rather than starting another request
    if (postsCache.loading) {
      console.log('Posts already loading, waiting...');
      
      // Wait for up to 8 seconds for loading to complete
      for (let i = 0; i < 80; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!postsCache.loading && postsCache.data) {
          console.log('Using freshly loaded posts data');
          return postsCache.data;
        }
      }
      
      // If still loading after timeout, throw error to trigger fallback
      if (postsCache.data) {
        console.log('Loading taking too long, returning stale data');
        return postsCache.data; // Return stale data instead of throwing
      }
      
      throw new Error('Timeout waiting for posts data');
    }
    
    // Set loading flag
    postsCache.loading = true;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // First, fetch posts with a timeout
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);
        
      clearTimeout(timeoutId);
  
      if (postsError) throw postsError;
      
      if (!postsData || postsData.length === 0) {
        console.log('No posts found');
        postsCache.data = [];
        postsCache.expiry = now + POSTS_CACHE_DURATION;
        return [];
      }
  
      console.log(`Found ${postsData.length} posts`);
  
      // Get all user IDs from the posts to fetch their profiles
      const userIds = [...new Set(postsData.map(post => post.user_id))];
      
      // Create a new controller for the next fetch
      const profileController = new AbortController();
      const profileTimeoutId = setTimeout(() => profileController.abort(), 10000);
      
      // Fetch all profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', userIds)
        .abortSignal(profileController.signal);
        
      clearTimeout(profileTimeoutId);
        
      if (profilesError) throw profilesError;
      
      // Create a map of user_id to profile data for quick lookup
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Count likes and comments in parallel using Promise.all with timeouts
      const postIds = postsData.map(post => post.id);
      
      // Create promise with timeout wrapper
      const withTimeout = (promise: Promise<any>, ms: number) => {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Operation timed out')), ms);
        });
        return Promise.race([
          promise,
          timeoutPromise,
        ]).finally(() => clearTimeout(timeoutId));
      };
      
      let likesCounts, commentsCounts;
      
      try {
        // Try to get all counts, but catch and provide fallbacks if it fails
        [likesCounts, commentsCounts] = await Promise.all([
          withTimeout(Promise.all(postIds.map(id => getLikesCountForPost(id))), 10000),
          withTimeout(Promise.all(postIds.map(id => getCommentsCountForPost(id))), 10000)
        ]);
      } catch (error) {
        console.error('Error getting counts, using fallbacks:', error);
        // Use fallback counts (all zeros)
        likesCounts = Array(postIds.length).fill(0);
        commentsCounts = Array(postIds.length).fill(0);
      }
      
      console.log('Successfully fetched all related data');
      
      // Combine everything
      const enhancedPosts = postsData.map((post, index) => {
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
          has_liked: false // This will be set separately for logged-in users
        };
      });
      
      // Update cache
      postsCache.data = enhancedPosts;
      postsCache.expiry = now + POSTS_CACHE_DURATION;
      postsCache.errorCount = 0;
      postsCache.lastError = null;
      
      return enhancedPosts;
    } catch (error: any) {
      // Handle errors with retry information
      console.error('Error fetching posts with profiles:', error);
      
      // Update error tracking
      postsCache.errorCount++;
      postsCache.lastError = error;
      postsCache.lastErrorTime = now;
      
      // If we have stale data, return it instead of failing
      if (postsCache.data) {
        console.log('Returning stale data due to fetch error');
        return postsCache.data;
      }
      
      throw new Error('A conexão expirou, tente novamente');
    } finally {
      // Clear loading flag
      postsCache.loading = false;
    }
  } catch (error: any) {
    console.error('Error at top level in getPostsWithProfiles:', error);
    
    // If we have stale data, return it instead of failing
    if (postsCache.data) {
      console.log('Returning stale data due to top-level error');
      return postsCache.data;
    }
    
    throw error;
  }
}

// Helper function to get user's liked posts
export async function getUserLikedPostIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);
      
    if (error) throw error;
    
    return (data || []).map(like => like.post_id);
  } catch (error) {
    console.error('Error fetching user liked posts:', error);
    return [];
  }
}

// Helper function for checking if user has liked a comment
export async function hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
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
    console.error('Error checking comment like status:', error);
    return false;
  }
}

// Helper function to get comment likes count
export async function getCommentLikesCount(commentId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting comment likes:', error);
    return 0;
  }
}

// Get user comment likes for multiple comments at once
export async function getUserCommentLikes(userId: string, commentIds: string[]): Promise<string[]> {
  if (!userId || !commentIds.length) return [];
  
  try {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', commentIds);
      
    if (error) throw error;
    
    return (data || []).map(like => like.comment_id);
  } catch (error) {
    console.error('Error fetching user comment likes:', error);
    return [];
  }
}

// Get user notifications
export async function getUserNotifications(userId: string, limit = 20): Promise<any[]> {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id (
          id,
          username:profiles(username),
          avatar_url:profiles(avatar_url),
          full_name:profiles(full_name)
        ),
        post:post_id (
          id,
          content
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// Create notification
export async function createNotification(
  type: string,
  userId: string,
  actorId: string,
  postId?: string,
  commentId?: string
): Promise<boolean> {
  try {
    // Don't create self-notifications
    if (userId === actorId) return true;
    
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
    console.error('Error creating notification:', error);
    return false;
  }
}

// Helper function to get follower count for a user
export async function getFollowerCountForUser(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting followers:', error);
    return 0;
  }
}

// Helper function to get following count for a user
export async function getFollowingCountForUser(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting following:', error);
    return 0;
  }
}

// Helper function to get posts for a specific user
export async function getPostsByUserId(userId: string) {
  let retries = 2;
  
  while (retries >= 0) {
    try {
      console.log('Profile: Starting to fetch posts for userId:', userId);
      
      // Fetch posts for this user
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      
      if (!postsData || postsData.length === 0) {
        return [];
      }

      // Fetch the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError) throw profileError;
      
      // Count likes and comments for each post with fallbacks
      const postIds = postsData.map(post => post.id);
      
      let likesCounts, commentsCounts;
      
      try {
        // Get likes counts
        likesCounts = await Promise.all(
          postIds.map(id => getLikesCountForPost(id).catch(() => 0))
        );
        
        // Get comments counts
        commentsCounts = await Promise.all(
          postIds.map(id => getCommentsCountForPost(id).catch(() => 0))
        );
      } catch (error) {
        console.error('Error getting counts, using fallbacks:', error);
        likesCounts = Array(postIds.length).fill(0);
        commentsCounts = Array(postIds.length).fill(0); 
      }
      
      // Combine everything
      const enhancedPosts = postsData.map((post, index) => {
        return {
          ...post,
          profiles: {
            username: profile?.username || 'usuário',
            avatar_url: profile?.avatar_url || null,
            full_name: profile?.full_name || null
          },
          likes: likesCounts[index] || 0,
          comments: commentsCounts[index] || 0,
          has_liked: false // This will be set separately for logged-in users
        };
      });
      
      return enhancedPosts;
    } catch (error: any) {
      console.error(`Error fetching user posts (attempt ${2-retries}/2):`, error);
      
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // On final retry failure, return empty array rather than throw
        console.error('All retries failed, returning empty array');
        return [];
      }
    }
  }
  
  // This should never be reached due to the return in the final catch block
  return [];
}

// Implementar a função getSavedPostsByUserId que está faltando
export async function getSavedPostsByUserId(userId: string) {
  let retries = 2;
  
  while (retries >= 0) {
    try {
      console.log('Profile: Starting to fetch saved posts for userId:', userId);
      
      // Fetch the saved post IDs for this user
      const { data: savedPostsData, error: savedPostsError } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (savedPostsError) throw savedPostsError;
      
      if (!savedPostsData || savedPostsData.length === 0) {
        return [];
      }

      // Extract post IDs
      const postIds = savedPostsData.map(item => item.post_id);
      
      // Fetch the actual posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, user_id')
        .in('id', postIds);

      if (postsError) throw postsError;
      
      if (!postsData || postsData.length === 0) {
        return [];
      }

      // Fetch all profiles for the user IDs in one batch
      const userIds = [...new Set(postsData.map(post => post.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map of user_id to profile data
      const profilesMap: Record<string, any> = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
      }

      // Get likes and comments counts with fallbacks
      let likesCounts, commentsCounts;
      
      try {
        [likesCounts, commentsCounts] = await Promise.all([
          Promise.all(postIds.map(id => getLikesCountForPost(id).catch(() => 0))),
          Promise.all(postIds.map(id => getCommentsCountForPost(id).catch(() => 0)))
        ]);
      } catch (error) {
        console.error('Error getting counts, using fallbacks:', error);
        likesCounts = Array(postIds.length).fill(0);
        commentsCounts = Array(postIds.length).fill(0);
      }
      
      // Combine everything
      const enhancedPosts = postsData.map(post => {
        const postIndex = postIds.indexOf(post.id);
        const profile = profilesMap[post.user_id] || {};
        
        return {
          ...post,
          profiles: {
            username: profile?.username || 'usuário',
            avatar_url: profile?.avatar_url || null,
            full_name: profile?.full_name || null
          },
          likes: postIndex >= 0 ? likesCounts[postIndex] || 0 : 0,
          comments: postIndex >= 0 ? commentsCounts[postIndex] || 0 : 0,
          has_liked: false // This will be set separately for logged-in users
        };
      });
      
      return enhancedPosts;
    } catch (error: any) {
      console.error(`Error fetching saved posts (attempt ${2-retries}/2):`, error);
      
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // On final retry failure, return empty array rather than throw
        console.error('All retries failed, returning empty array');
        return [];
      }
    }
  }
  
  // This should never be reached due to the return in the final catch block
  return [];
}
