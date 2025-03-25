
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookmarkIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { savePost, unsavePost, isPostSaved } from '@/integrations/supabase/functions';
import { toast } from 'sonner';

interface SavePostButtonProps {
  postId: string;
  onRefresh?: () => void;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost";
}

const SavePostButton: React.FC<SavePostButtonProps> = ({ 
  postId, 
  onRefresh, 
  size = "default", 
  variant = "ghost" 
}) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkSavedStatus();
    }
  }, [user, postId]);

  const checkSavedStatus = async () => {
    if (!user) return;
    
    try {
      const saved = await isPostSaved(postId);
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar publicações');
      return;
    }

    setIsLoading(true);
    try {
      let success;
      
      if (isSaved) {
        success = await unsavePost(postId);
        if (success) {
          toast.success('Publicação removida dos salvos');
        }
      } else {
        success = await savePost(postId);
        if (success) {
          toast.success('Publicação salva');
        }
      }

      if (success) {
        setIsSaved(!isSaved);
        if (onRefresh) onRefresh();
      } else {
        throw new Error('Falha ao salvar/remover publicação');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Erro ao salvar/remover publicação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleToggleSave}
      disabled={isLoading}
      className={isSaved ? "text-primary" : ""}
    >
      <BookmarkIcon 
        className={`h-4 w-4 ${isSaved ? "fill-primary" : ""}`} 
      />
    </Button>
  );
};

export default SavePostButton;
