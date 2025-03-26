
import { supabase } from './client';

// Helper function to get profile data by user ID
export async function getProfileByUserId(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
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
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;
    
    if (!postsData || postsData.length === 0) {
      console.log('No posts found');
      return [];
    }

    console.log(`Found ${postsData.length} posts`);

    // Get all user IDs from the posts to fetch their profiles
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch all profiles for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
      
    if (profilesError) throw profilesError;
    
    // Create a map of user_id to profile data for quick lookup
    const profilesMap = (profilesData || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);
    
    // Count likes for each post
    const postIds = postsData.map(post => post.id);
    
    // Get likes counts - in parallel
    const likesPromises = postIds.map(id => getLikesCountForPost(id));
    const likesCounts = await Promise.all(likesPromises);
    
    // Get comments counts - in parallel
    const commentsPromises = postIds.map(id => getCommentsCountForPost(id));
    const commentsCounts = await Promise.all(commentsPromises);
    
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
    
    return enhancedPosts;
  } catch (error) {
    console.error('Error fetching posts with profiles:', error);
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

// Helper function to check if user has saved a post
export async function hasUserSavedPost(userId: string, postId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    
    return !!data;
  } catch (error) {
    console.error('Error checking saved post status:', error);
    return false;
  }
}

// Helper function to get saved posts for a user
export async function getSavedPostsByUserId(userId: string) {
  try {
    // First get the IDs of saved posts
    const { data: savedData, error: savedError } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (savedError) throw savedError;
    
    if (!savedData || savedData.length === 0) {
      return [];
    }
    
    const postIds = savedData.map(item => item.post_id);
    
    // Then fetch the actual posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);
      
    if (postsError) throw postsError;
    
    if (!postsData || postsData.length === 0) {
      return [];
    }
    
    // Get all user IDs from the posts to fetch their profiles
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch all profiles for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
      
    if (profilesError) throw profilesError;
    
    // Create a map of user_id to profile data for quick lookup
    const profilesMap = (profilesData || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);
    
    // Get likes and comments counts for each post
    const likesPromises = postsData.map(post => getLikesCountForPost(post.id));
    const likesCounts = await Promise.all(likesPromises);
    
    const commentsPromises = postsData.map(post => getCommentsCountForPost(post.id));
    const commentsCounts = await Promise.all(commentsPromises);
    
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
    
    return enhancedPosts;
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    throw error;
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
