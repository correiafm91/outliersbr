
import React from 'react';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import UserSearch from '@/components/search/UserSearch';

const Explore: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen">
          <p>Faça login para explorar</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="page-container p-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Explorar</h1>
          </div>
          <p className="text-muted-foreground">Encontre pessoas e conteúdo</p>
        </motion.div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="users" className="flex-1">Usuários</TabsTrigger>
            <TabsTrigger value="trending" className="flex-1">Tendências</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-2">
            <UserSearch />
          </TabsContent>
          
          <TabsContent value="trending" className="mt-2">
            <div className="text-center py-10">
              <p className="text-muted-foreground">Em breve: Tendências e tópicos populares</p>
            </div>
          </TabsContent>
        </Tabs>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Explore;
