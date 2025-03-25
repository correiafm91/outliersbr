
import { supabase } from './client';

// Reusable function for handling timeouts on Supabase queries
const withTimeout = async (promise, timeoutMs = 3000, fallbackValue = null) => {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Add abort signal to the promise if it's a Supabase query
    const promiseWithTimeout = promise.abortSignal 
      ? promise.abortSignal(controller.signal) 
      : promise;
      
    const result = await promiseWithTimeout;
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    console.error('Operation timed out or failed:', error);
    return fallbackValue;
  }
};

// Helper function to get profile data by user ID
export async function getProfileByUserId(userId: string) {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    );
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Helper function to get profile data by username
export async function getProfileByUsername(username: string) {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle()
    );
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching profile by username:', error);
    return null;
  }
}

// Helper function to follow a user
export async function followUser(targetUserId: string) {
  try {
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: (await supabase.auth.getUser()).data.user?.id,
        following_id: targetUserId
      });
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
}

// Helper function to unfollow a user
export async function unfollowUser(targetUserId: string) {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({
        follower_id: (await supabase.auth.getUser()).data.user?.id,
        following_id: targetUserId
      });
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
}

// Helper function to check if the current user is following another user
export async function isFollowingUser(targetUserId: string): Promise<boolean> {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return false;
    
    const { data, error } = await withTimeout(
      supabase
        .from('follows')
        .select('id')
        .match({
          follower_id: currentUser.id,
          following_id: targetUserId
        })
        .maybeSingle()
    );
      
    if (error) throw error;
    
    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

// Helper function to get followers count for a user
export async function getFollowersCount(userId: string): Promise<number> {
  try {
    const { count, error } = await withTimeout(
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      3000,
      { count: 0 }
    );
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting followers:', error);
    return 0;
  }
}

// Helper function to get following count for a user
export async function getFollowingCount(userId: string): Promise<number> {
  try {
    const { count, error } = await withTimeout(
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId),
      3000,
      { count: 0 }
    );
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting following:', error);
    return 0;
  }
}

// Helper function to get followers for a user with profile data
export async function getFollowers(userId: string) {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId)
    );
      
    if (error) throw error;
    
    if (!data || data.length === 0) return [];
    
    const followerIds = data.map(follow => follow.follower_id);
    
    const { data: profilesData, error: profilesError } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .in('id', followerIds)
    );
      
    if (profilesError) throw profilesError;
    
    return profilesData || [];
  } catch (error) {
    console.error('Error fetching followers:', error);
    return [];
  }
}

// Helper function to get users that a user is following with profile data
export async function getFollowing(userId: string) {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
    );
      
    if (error) throw error;
    
    if (!data || data.length === 0) return [];
    
    const followingIds = data.map(follow => follow.following_id);
    
    const { data: profilesData, error: profilesError } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .in('id', followingIds)
    );
      
    if (profilesError) throw profilesError;
    
    return profilesData || [];
  } catch (error) {
    console.error('Error fetching following:', error);
    return [];
  }
}

// Helper function to save a post for a user
export async function savePost(postId: string) {
  try {
    const { error } = await supabase
      .from('saved_posts')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        post_id: postId
      });
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error saving post:', error);
    return false;
  }
}

// Helper function to unsave a post
export async function unsavePost(postId: string) {
  try {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .match({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        post_id: postId
      });
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error unsaving post:', error);
    return false;
  }
}

// Helper function to check if a post is saved by the current user
export async function isPostSaved(postId: string): Promise<boolean> {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return false;
    
    const { data, error } = await withTimeout(
      supabase
        .from('saved_posts')
        .select('id')
        .match({
          user_id: currentUser.id,
          post_id: postId
        })
        .maybeSingle()
    );
      
    if (error) throw error;
    
    return !!data;
  } catch (error) {
    console.error('Error checking saved status:', error);
    return false;
  }
}

// Helper function to get saved posts for a user
export async function getSavedPosts(userId: string) {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', userId)
    );
      
    if (error) throw error;
    
    if (!data || data.length === 0) return [];
    
    const postIds = data.map(saved => saved.post_id);
    
    // Get posts with profiles
    const { data: postsData, error: postsError } = await withTimeout(
      supabase
        .from('posts')
        .select('*, profiles:user_id(*)')
        .in('id', postIds)
    );
      
    if (postsError) throw postsError;
    
    return postsData || [];
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    return [];
  }
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
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    
    return !!data;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
}

// Helper function to get likes count for a post
export async function getLikesCountForPost(postId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting likes:', error);
    return 0;
  }
}

// Helper function to get comments count for a post
export async function getCommentsCountForPost(postId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting comments:', error);
    return 0;
  }
}

// Helper function to get posts with profile data - optimized with faster timeouts
export async function getPostsWithProfiles() {
  try {
    console.log('Starting getPostsWithProfiles function');
    // First, fetch posts with a timeout
    const { data: postsData, error: postsError } = await withTimeout(
      supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false }),
      3000,
      []
    );

    if (postsError) throw postsError;
    
    if (!postsData || postsData.length === 0) {
      console.log('No posts found');
      return [];
    }

    console.log(`Found ${postsData.length} posts`);

    // Get all user IDs from the posts to fetch their profiles
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch all profiles for these users
    const { data: profilesData, error: profilesError } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .in('id', userIds),
      3000,
      []
    );
      
    if (profilesError) throw profilesError;
    
    // Create a map of user_id to profile data for quick lookup
    const profilesMap = (profilesData || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);
    
    // Count likes and comments in batches to avoid timeouts
    const enhancedPosts = await Promise.all(
      postsData.map(async (post) => {
        const likes = await getLikesCountForPost(post.id);
        const comments = await getCommentsCountForPost(post.id);
        
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
          likes: likes || 0,
          comments: comments || 0,
          has_liked: false // This will be set separately for logged-in users
        };
      })
    );
    
    console.log('Successfully fetched all related data');
    return enhancedPosts;
  } catch (error) {
    console.error('Error fetching posts with profiles:', error);
    throw error;
  }
}

// Helper function to get user's liked posts
export async function getUserLikedPostIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId),
      3000,
      []
    );
      
    if (error) throw error;
    
    return (data || []).map(like => like.post_id);
  } catch (error) {
    console.error('Error fetching user liked posts:', error);
    return [];
  }
}

// Helper function to get posts for a specific user
export async function getPostsByUserId(userId: string) {
  try {
    // Fetch posts for this user
    const { data: postsData, error: postsError } = await withTimeout(
      supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      3000,
      []
    );

    if (postsError) throw postsError;
    
    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Fetch the user's profile
    const { data: profile, error: profileError } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      3000,
      null
    );
      
    if (profileError) throw profileError;
    
    if (!profile) {
      return [];
    }
    
    // Process posts in batches to avoid timeouts
    const enhancedPosts = await Promise.all(
      postsData.map(async (post) => {
        const likes = await getLikesCountForPost(post.id);
        const comments = await getCommentsCountForPost(post.id);
        
        return {
          ...post,
          profiles: {
            username: profile.username,
            avatar_url: profile.avatar_url,
            full_name: profile.full_name
          },
          likes: likes || 0,
          comments: comments || 0,
          has_liked: false // This will be set separately for logged-in users
        };
      })
    );
    
    return enhancedPosts;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }
}

// Helper functions for likes and comments counts
export async function getLikesCountForPost(postId: string): Promise<number> {
  try {
    const { count, error } = await withTimeout(
      supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
      2000,
      { count: 0 }
    );
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting likes:', error);
    return 0;
  }
}

export async function getCommentsCountForPost(postId: string): Promise<number> {
  try {
    const { count, error } = await withTimeout(
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
      2000,
      { count: 0 }
    );
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error counting comments:', error);
    return 0;
  }
}
