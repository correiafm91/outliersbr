
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { AnimatePresence } from 'framer-motion';
import VersionBadge from '@/components/layout/VersionBadge';
import { supabase, ensureCommentLikesTable, ensureNotificationsTable } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Lazy loaded components
const Index = lazy(() => import('@/pages/Index'));
const Explore = lazy(() => import('@/pages/Explore'));
const Create = lazy(() => import('@/pages/Create'));
const Profile = lazy(() => import('@/pages/Profile'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Create a client with improved configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // Increased from 2 to 3
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      gcTime: 1000 * 60 * 30, // 30 minutes (nova propriedade no lugar de cacheTime)
    },
  },
});

function App() {
  const [tablesInitialized, setTablesInitialized] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);

  // Ensure database tables are initialized with retry
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check connectivity before attempting initialization
        const { data, error } = await supabase.from('profiles').select('count(*)', { count: 'exact', head: true }).limit(1);
        
        if (error) {
          console.error('Connectivity check failed:', error);
          throw new Error('Sem conexão com o banco de dados');
        }
        
        // Check and create necessary tables
        await Promise.all([
          ensureCommentLikesTable(),
          ensureNotificationsTable()
        ]);
        
        console.log('Supabase tables initialized successfully');
        setTablesInitialized(true);
      } catch (error: any) {
        console.error('Error initializing Supabase tables:', error);
        
        // If we've tried less than 3 times, retry after delay
        if (initAttempts < 3) {
          console.log(`Retrying initialization (attempt ${initAttempts + 1}/3)...`);
          setTimeout(() => {
            setInitAttempts(prev => prev + 1);
          }, 3000); // Wait 3 seconds before retry
        } else {
          // After 3 failed attempts, proceed anyway
          setTablesInitialized(true);
          toast.error('Problemas de conexão', {
            description: 'Algumas funcionalidades podem não estar disponíveis. Verifique sua conexão com a internet.',
          });
        }
      }
    };
    
    if (!tablesInitialized) {
      initializeApp();
    }
  }, [tablesInitialized, initAttempts]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <VersionBadge />
            <AnimatePresence mode="wait" initial={false}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-screen">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              }>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/create" element={<Create />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
            <Toaster position="top-center" />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
