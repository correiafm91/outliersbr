
import React, { useState } from 'react';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Search, Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import UserSearch from '@/components/search/UserSearch';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Explore: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);
  
  // Show loading help message if taking too long
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingHelp(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingHelp(false);
    }
  }, [isLoading]);
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black">
          <img 
            src="https://i.postimg.cc/8z1WJxkR/High-resolution-stock-photo-A-professional-commercial-image-showcasing-a-grey-letter-O-logo-agains.png" 
            alt="Outliers Logo" 
            className="h-24 w-24 mb-4 animate-pulse"
          />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <p className="text-muted-foreground text-center">Carregando...</p>
          
          {showLoadingHelp && (
            <div className="mt-4 max-w-md text-center">
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
                  Recarregar Página
                </Button>
              </Alert>
            </div>
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
              <div className="text-center py-10">
                <p className="text-muted-foreground">Em breve: Tendências e tópicos populares</p>
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
