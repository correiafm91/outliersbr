
import React, { useState } from 'react';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import AuthForm from '@/components/auth/AuthForm';
import FeedList from '@/components/feed/FeedList';
import { motion } from 'framer-motion';

const Index: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // For demo purposes, we'll simulate a logged in state
  // In a real app, this would come from an auth provider/context
  
  return (
    <PageTransition>
      <main className="min-h-screen pb-20">
        {isAuthenticated ? (
          <div className="page-container">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <h1 className="text-3xl font-bold text-center mb-1">Outliers</h1>
              <p className="text-center text-muted-foreground">Sua rede profissional</p>
            </motion.div>
            
            <FeedList />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen p-4">
            <AuthForm />
          </div>
        )}
        
        {isAuthenticated && <BottomNav />}
        
        {/* For demo purposes, add a toggle button */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsAuthenticated(!isAuthenticated)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs"
          >
            {isAuthenticated ? "Logout (Demo)" : "Login (Demo)"}
          </button>
        </div>
      </main>
    </PageTransition>
  );
};

export default Index;
