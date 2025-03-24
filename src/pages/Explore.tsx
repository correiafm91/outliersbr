
import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Search, RefreshCcw, AlertCircle } from 'lucide-react';
import UserSearch from '@/components/search/UserSearch';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const Explore: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);
  
  // Reduce timeout for showing loading help message
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingHelp(true);
      }, 2000); // Reduced from 3000ms to 2000ms
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingHelp(false);
    }
  }, [isLoading]);
  
  // Adding a forced completion timeout after 7 seconds
  useEffect(() => {
    const forceCompleteTimer = setTimeout(() => {
      if (isLoading) {
        console.log('Force loading completion after timeout');
        setShowLoadingHelp(true);
      }
    }, 7000);
    
    return () => clearTimeout(forceCompleteTimer);
  }, [isLoading]);
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black">
          <img 
            src="https://i.postimg.cc/8z1WJxkR/High-resolution-stock-photo-A-professional-commercial-image-showcasing-a-grey-letter-O-logo-agains.png" 
            alt="Outliers Logo" 
            className="h-20 w-20 mb-4 animate-pulse"
          />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <p className="text-muted-foreground text-center">Carregando...</p>
          
          {showLoadingHelp && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 max-w-md"
            >
              <Alert variant="default" className="bg-background/50 border-primary/50 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="text-foreground">Está demorando mais que o esperado</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  O sistema pode estar enfrentando dificuldades de conexão. 
                  Tente recarregar a página.
                </AlertDescription>
                <Button 
                  size="sm" 
                  className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Recarregar Página
                </Button>
              </Alert>
            </motion.div>
          )}
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
          <img 
            src="https://i.postimg.cc/8z1WJxkR/High-resolution-stock-photo-A-professional-commercial-image-showcasing-a-grey-letter-O-logo-agains.png" 
            alt="Outliers Logo" 
            className="w-20 h-20 mb-6" 
          />
          <p className="text-gray-400">Faça login para explorar</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="page-container p-4 pb-20 bg-black min-h-screen">
        <div className="flex items-center justify-center mb-6">
          <img 
            src="https://i.postimg.cc/8z1WJxkR/High-resolution-stock-photo-A-professional-commercial-image-showcasing-a-grey-letter-O-logo-agains.png" 
            alt="Outliers Logo" 
            className="w-14 h-14 mb-2" 
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Explorar</h1>
          </div>
          <p className="text-muted-foreground">Encontre pessoas e conteúdo</p>
        </motion.div>

        <Card className="bg-black/60 border-gray-800 backdrop-blur-sm">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="w-full mb-6 bg-black/60">
              <TabsTrigger value="users" className="flex-1 data-[state=active]:bg-gray-800 data-[state=active]:text-white">Usuários</TabsTrigger>
              <TabsTrigger value="trending" className="flex-1 data-[state=active]:bg-gray-800 data-[state=active]:text-white">Tendências</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="mt-2 px-3 pb-3">
              <UserSearch />
            </TabsContent>
            
            <TabsContent value="trending" className="mt-2 px-3 pb-3">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full bg-gray-800/50" />
                <Skeleton className="h-12 w-full bg-gray-800/50" />
                <Skeleton className="h-12 w-full bg-gray-800/50" />
                <p className="text-muted-foreground text-center pt-4">Em breve: Tendências e tópicos populares</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Explore;
