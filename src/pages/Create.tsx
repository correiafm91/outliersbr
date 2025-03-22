
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PostForm from '@/components/post/PostForm';

const Create: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <PageTransition>
      <main className="min-h-screen pb-20 px-4 bg-background text-foreground">
        <div className="max-w-md mx-auto pt-6">
          <h1 className="text-3xl font-bold mb-8 text-center">Criar Publicação</h1>
          <PostForm />
        </div>
        <BottomNav />
      </main>
    </PageTransition>
  );
};

export default Create;
