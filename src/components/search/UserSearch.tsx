
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface UserResult {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const UserSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    } else {
      setResults([]);
      setShowNoResults(false);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    setIsSearching(true);
    setShowNoResults(false);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .or(`username.ilike.%${searchTerm}%, full_name.ilike.%${searchTerm}%`)
        .limit(10);
        
      if (error) throw error;
      
      setResults(data || []);
      setShowNoResults(data.length === 0);
    } catch (error) {
      console.error('Error searching users:', error);
      setResults([]);
      setShowNoResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };
  
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Procurar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 py-5"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {results.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {results.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 rounded-md border bg-card transition-colors hover:bg-accent/50 cursor-pointer"
              onClick={() => handleViewProfile(user.username)}
            >
              <Avatar className="h-10 w-10 border-2 border-primary/10">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.username[0].toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-foreground">{user.full_name || user.username}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
              <Button variant="ghost" size="sm">Ver Perfil</Button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {showNoResults && searchTerm.length >= 2 && (
        <div className="text-center py-8">
          <UserRound className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente uma busca diferente</p>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
