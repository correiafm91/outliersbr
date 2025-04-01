import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

type ProfileData = {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  full_name: string | null;
  industry: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  is_public: boolean | null;
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchProfile = async (userId: string) => {
    try {
      setIsProfileLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
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

      const profileWithBanner = {
        ...data,
        banner_url: data.banner_url || null
      };

      setProfile(profileWithBanner);
      
      setHasCompletedProfile(!!(data?.avatar_url));
      
      return profileWithBanner;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    } finally {
      setIsProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    if (authInitialized) return;
    
    const initializeAuth = async () => {
      try {
        const loadingTimeout = setTimeout(() => {
          if (isLoading) {
            console.log('Auth loading timeout reached, forcing completion');
            setIsLoading(false);
          }
        }, 8000);
        
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

        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (retryCount >= 3) {
            setSession(null);
            setUser(null);
            setIsLoading(false);
          } else {
            setRetryCount(prev => prev + 1);
            setTimeout(() => setAuthInitialized(false), 2000);
          }
          clearTimeout(loadingTimeout);
          return;
        }
        
        setSession(data.session);
        setUser(data.session?.user ?? null);
        
        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
        }
        
        setIsLoading(false);
        setAuthInitialized(true);
        clearTimeout(loadingTimeout);
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsLoading(false);
        
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => setAuthInitialized(false), 2000);
        } else {
          setAuthInitialized(true);
        }
      }
    };
    
    setAuthInitialized(true);
    initializeAuth();
  }, [isLoading, retryCount, authInitialized]);

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
