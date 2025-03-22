
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
