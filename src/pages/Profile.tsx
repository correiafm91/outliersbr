
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import ProfileForm from '@/components/profile/ProfileForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    } else if (user) {
      fetchProfile();
    }
  }, [user, isLoading, navigate]);

  const fetchProfile = async () => {
    try {
      setIsProfileLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfileData(data);
    } catch (error: any) {
      toast.error('Erro ao carregar perfil', {
        description: error.message,
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 px-4 bg-background text-foreground">
        <div className="max-w-md mx-auto pt-6">
          <h1 className="text-3xl font-bold mb-8 text-center">Seu Perfil</h1>
          <ProfileForm initialData={profileData} onSuccess={fetchProfile} />
        </div>
        <BottomNav />
      </main>
    </PageTransition>
  );
};

export default Profile;
