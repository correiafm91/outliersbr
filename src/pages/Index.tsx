
import React from 'react';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import AuthForm from '@/components/auth/AuthForm';
import FeedList from '@/components/feed/FeedList';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const Index: React.FC = () => {
  const { user, isLoading, signOut } = useAuth();
  
  const handleLogout = async () => {
    await signOut();
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
      <main className="min-h-screen pb-20">
        {user ? (
          <div className="page-container">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold mb-1">Outliers</h1>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
              <p className="text-muted-foreground">Sua rede profissional</p>
            </motion.div>
            
            <FeedList />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen p-4">
            <AuthForm />
          </div>
        )}
        
        {user && <BottomNav />}
      </main>
    </PageTransition>
  );
};

export default Index;
