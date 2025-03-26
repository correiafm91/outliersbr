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
export async function batchedQuery(table: string, column: string, values: any[], select: string = '*') {
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
  loading: false
};
const POSTS_CACHE_DURATION = 30 * 1000; // 30 seconds

export async function getPostsWithProfiles() {
  try {
    const now = Date.now();
    console.log('Starting getPostsWithProfiles function');
    
    // Return cached data if available and not expired
    if (postsCache.data && now < postsCache.expiry && !postsCache.loading) {
      console.log('Returning cached posts data');
      return postsCache.data;
    }
    
    // If already loading, wait for it to complete rather than starting another request
    if (postsCache.loading) {
      console.log('Posts already loading, waiting...');
      // Wait for up to 5 seconds for loading to complete
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!postsCache.loading && postsCache.data) {
          console.log('Using freshly loaded posts data');
          return postsCache.data;
        }
      }
      
      // If still loading after timeout, throw error to trigger fallback
      throw new Error('Timeout waiting for posts data');
    }
    
    // Set loading flag
    postsCache.loading = true;
    
    try {
      // First, fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
  
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
      
      // Fetch all profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map of user_id to profile data for quick lookup
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Count likes and comments in parallel using Promise.all
      const postIds = postsData.map(post => post.id);
      
      const [likesCounts, commentsCounts] = await Promise.all([
        // Batch likes counts
        Promise.all(postIds.map(id => getLikesCountForPost(id))),
        // Batch comments counts
        Promise.all(postIds.map(id => getCommentsCountForPost(id)))
      ]);
      
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
      
      return enhancedPosts;
    } finally {
      // Clear loading flag
      postsCache.loading = false;
    }
  } catch (error) {
    console.error('Error fetching posts with profiles:', error);
    postsCache.loading = false;
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
  try {
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
    
    // Count likes and comments for each post
    const postIds = postsData.map(post => post.id);
    
    // Get likes counts
    const likesPromises = postIds.map(id => getLikesCountForPost(id));
    const likesCounts = await Promise.all(likesPromises);
    
    // Get comments counts
    const commentsPromises = postIds.map(id => getCommentsCountForPost(id));
    const commentsCounts = await Promise.all(commentsPromises);
    
    // Combine everything
    const enhancedPosts = postsData.map((post, index) => {
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
    
    return enhancedPosts;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }
}
