
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import AuthForm from '@/components/auth/AuthForm';
import FeedList from '@/components/feed/FeedList';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Index: React.FC = () => {
  const { user, isLoading, signOut, profile, hasCompletedProfile } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await signOut();
  };

  const navigateToProfile = () => {
    navigate('/profile');
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  return (
    <PageTransition>
      <main className="min-h-screen pb-20 bg-background text-foreground">
        {user ? (
          <div className="page-container px-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold mb-1 text-foreground">Outliers</h1>
                  {profile?.username?.toLowerCase() === 'outliersofc' && (
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">Oficial</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar 
                    className="cursor-pointer border-2 border-primary h-10 w-10"
                    onClick={navigateToProfile}
                  >
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.username || 'Perfil'} />
                    ) : (
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {(profile?.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-foreground">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground">Sua rede profissional</p>
            </motion.div>
            
            {!hasCompletedProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mb-6"
              >
                <Alert variant="default" className="border-primary/50 bg-primary/10">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-foreground">Complete seu perfil</AlertTitle>
                  <AlertDescription className="text-foreground/80">
                    Adicione uma foto de perfil e mais informações para se conectar com outras pessoas.
                  </AlertDescription>
                  <Button 
                    size="sm" 
                    className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={navigateToProfile}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Completar Perfil
                  </Button>
                </Alert>
              </motion.div>
            )}
            
            <FeedList />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen p-4 bg-background">
            <AuthForm />
          </div>
        )}
        
        {user && <BottomNav />}
      </main>
    </PageTransition>
  );
};

export default Index;
