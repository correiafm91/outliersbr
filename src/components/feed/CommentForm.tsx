
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ postId, onCommentAdded }) => {
  const { user, profile } = useAuth();
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<Array<{id: string, username: string, avatar_url: string | null}>>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showMentions && mentionQuery.length > 0) {
      searchUsers(mentionQuery);
    }
  }, [mentionQuery, showMentions]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    
    // Handle mentions
    const curPos = e.target.selectionStart || 0;
    setCursorPosition(curPos);
    
    // Check if we just typed '@'
    if (value.charAt(curPos - 1) === '@') {
      setShowMentions(true);
      setMentionQuery('');
    } 
    // If we already are in mention mode, update the query
    else if (showMentions) {
      // Extract the current mention query
      const textBeforeCursor = value.substring(0, curPos);
      const atSymbolIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atSymbolIndex >= 0) {
        const query = textBeforeCursor.substring(atSymbolIndex + 1);
        // If there's a space, we're done with this mention
        if (query.includes(' ')) {
          setShowMentions(false);
        } else {
          setMentionQuery(query);
        }
      } else {
        // No @ symbol before cursor, so close mentions
        setShowMentions(false);
      }
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setMentionResults([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(5);
        
      if (error) throw error;
      
      setMentionResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setMentionResults([]);
    }
  };

  const insertMention = (username: string) => {
    if (textareaRef.current) {
      const textBeforeCursor = comment.substring(0, cursorPosition);
      const textAfterCursor = comment.substring(cursorPosition);
      
      // Find the last @ before cursor
      const atSymbolIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atSymbolIndex >= 0) {
        // Replace the @query with @username
        const newText = 
          textBeforeCursor.substring(0, atSymbolIndex) + 
          '@' + username + ' ' + 
          textAfterCursor;
          
        setComment(newText);
        
        // Set cursor after the inserted mention
        const newCursorPos = atSymbolIndex + username.length + 2; // +2 for @ and space
        
        // Need to defer to ensure the textarea has updated
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
    }
    
    setShowMentions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('É necessário fazer login para comentar');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('O comentário não pode estar vazio');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Insert the comment
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          content: comment,
          post_id: postId,
          user_id: user.id
        })
        .select('id')
        .single();
        
      if (commentError) throw commentError;
      
      // Process mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = comment.match(mentionRegex);
      
      if (mentions && mentions.length > 0) {
        // Get unique usernames
        const mentionedUsernames = [...new Set(mentions.map(m => m.substring(1)))];
        
        // Find user IDs for the mentioned usernames
        const { data: mentionedUsers, error: mentionError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', mentionedUsernames);
          
        if (mentionError) throw mentionError;
        
        // Create notification for each mentioned user
        if (mentionedUsers && mentionedUsers.length > 0) {
          const notifications = mentionedUsers.map(mentionedUser => ({
            type: 'mention',
            user_id: mentionedUser.id,
            actor_id: user.id,
            post_id: postId,
            comment_id: commentData.id,
            read: false,
            created_at: new Date().toISOString()
          }));
          
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications);
            
          if (notificationError) {
            console.error('Error creating mention notifications:', notificationError);
          }
        }
      }
      
      toast.success('Comentário adicionado com sucesso');
      setComment('');
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error('Erro ao adicionar comentário', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="border rounded-md p-4 text-center text-muted-foreground">
        Você precisa estar logado para comentar
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3 mb-4">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username || "User"} />
        <AvatarFallback>{profile?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
      </Avatar>
      
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          placeholder="Adicione um comentário..."
          value={comment}
          onChange={handleCommentChange}
          className="min-h-[80px] resize-none pr-10"
          disabled={isLoading}
        />
        
        {showMentions && (
          <div className="absolute mt-1 left-0 right-0 bg-card border rounded-md shadow-md z-10">
            {mentionResults.length > 0 ? (
              mentionResults.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
                  onClick={() => insertMention(user.username)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                    <AvatarFallback>{user.username[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">@{user.username}</span>
                </div>
              ))
            ) : (
              <div className="p-2 text-sm text-muted-foreground">
                {mentionQuery ? 'Nenhum usuário encontrado' : 'Digite um nome de usuário'}
              </div>
            )}
          </div>
        )}
        
        <Button 
          type="submit" 
          size="sm" 
          className="absolute right-2 top-2"
          disabled={isLoading || !comment.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;
