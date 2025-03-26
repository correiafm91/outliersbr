
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

type ProfileData = {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  [key: string]: any;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  profile: ProfileData | null;
  isProfileLoading: boolean;
  hasCompletedProfile: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);

  // Fetch profile data function with improved error handling
  const fetchProfile = async (userId: string) => {
    try {
      setIsProfileLoading(true);
      
      // Create a controller for timeout management
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      setProfile(data);
      // Check if profile has been completed (has bio or avatar)
      setHasCompletedProfile(!!(data?.bio || data?.avatar_url));
      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Refresh profile function that can be called from components
  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Create a timeout to set loading to false after max allowed time
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('Auth loading timeout reached, forcing completion');
        setIsLoading(false);
      }
    }, 8000); // Force completion after 8 seconds max

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setHasCompletedProfile(false);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Você saiu da sua conta');
    } catch (error: any) {
      toast.error('Erro ao sair da conta', {
        description: error.message,
      });
    }
  };

  const value = {
    session,
    user,
    isLoading,
    profile,
    isProfileLoading,
    hasCompletedProfile,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
