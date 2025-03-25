
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  MessageCircle, 
  ArrowLeft, 
  Loader2, 
  PlusCircle, 
  User,
  Clock 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Placeholder component for future implementation
const MessagesList = () => {
  return (
    <div className="flex flex-col h-[60vh] items-center justify-center text-center text-muted-foreground">
      <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
      <h3 className="text-xl font-medium mb-2">Mensagens em breve</h3>
      <p className="max-w-xs">
        Estamos trabalhando para implementar o sistema de mensagens diretas.
      </p>
    </div>
  );
};

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      toast.error('Você precisa estar logado para acessar mensagens');
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container max-w-2xl mx-auto p-4 min-h-screen bg-black text-white pb-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-white mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Mensagens</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Pesquisar mensagens"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-700"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-gray-900">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">Não lidas</TabsTrigger>
            <TabsTrigger value="requests">Solicitações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <MessagesList />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-4">
            <div className="flex flex-col h-[60vh] items-center justify-center text-center text-muted-foreground">
              <Clock className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Nenhuma mensagem não lida</h3>
            </div>
          </TabsContent>
          
          <TabsContent value="requests" className="mt-4">
            <div className="flex flex-col h-[60vh] items-center justify-center text-center text-muted-foreground">
              <User className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Nenhuma solicitação de mensagem</h3>
            </div>
          </TabsContent>
        </Tabs>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default MessagesPage;
