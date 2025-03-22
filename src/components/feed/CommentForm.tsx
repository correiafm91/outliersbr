
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  onCommentAdded?: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ 
  postId, 
  parentId, 
  onCommentAdded 
}) => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('É necessário fazer login para comentar');
      return;
    }
    
    if (!content.trim()) {
      toast.error('O comentário não pode estar vazio');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null
        });
      
      if (error) throw error;
      
      setContent('');
      toast.success('Comentário adicionado com sucesso!');
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error: any) {
      toast.error('Erro ao adicionar comentário', {
        description: error.message,
      });
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <div className="text-center p-4 text-sm text-muted-foreground">
        Faça login para adicionar um comentário
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username || 'Usuario'} />
          <AvatarFallback>
            {profile?.username ? profile.username[0].toUpperCase() : 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <Textarea
            placeholder="Escreva um comentário..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            className="min-h-[60px] text-foreground resize-none"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Comentar'
          )}
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;
