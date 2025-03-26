
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendHorizonal, Search, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ postId, onCommentAdded }) => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTypingMention, setIsTypingMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 });

  // Handle typing in the comment box
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Check if we're typing a mention
    const lastAtSymbolIndex = newContent.lastIndexOf('@');
    if (lastAtSymbolIndex !== -1) {
      const textAfterAt = newContent.slice(lastAtSymbolIndex + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');
      const mentionText = spaceAfterAt === -1 ? textAfterAt : textAfterAt.slice(0, spaceAfterAt);
      
      if (mentionText.length > 0) {
        setIsTypingMention(true);
        setMentionQuery(mentionText);
        setMentionPosition({ 
          start: lastAtSymbolIndex, 
          end: lastAtSymbolIndex + mentionText.length + 1
        });
        searchUsers(mentionText);
      } else if (spaceAfterAt !== -1 || mentionText.length === 0) {
        setIsTypingMention(false);
        setMentionResults([]);
      }
    } else {
      setIsTypingMention(false);
      setMentionResults([]);
    }
  };

  // Search for users matching the mention query
  const searchUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionResults([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .ilike('username', `${query}%`)
        .limit(5);
        
      if (error) throw error;
      
      setMentionResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setMentionResults([]);
    }
  };

  // Insert the selected mention into the comment
  const insertMention = (username: string) => {
    const beforeMention = content.slice(0, mentionPosition.start);
    const afterMention = content.slice(mentionPosition.end);
    
    const newContent = `${beforeMention}@${username} ${afterMention}`;
    setContent(newContent);
    setIsTypingMention(false);
    setMentionResults([]);
    
    // Focus back on textarea after selection
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Extract mentions from comment text
  const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@(\w+)/g) || [];
    return mentions.map(mention => mention.substring(1));
  };

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
    
    setIsLoading(true);
    
    try {
      // 1. Add the comment
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          content: content.trim(),
          post_id: postId,
          user_id: user.id
        })
        .select()
        .single();
        
      if (commentError) throw commentError;
      
      // 2. Extract mentions and create notifications
      const mentions = extractMentions(content);
      
      if (mentions.length > 0) {
        // Get post details for the notification
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();
        
        if (postError) throw postError;
        
        // Get user IDs for the mentioned usernames
        const { data: mentionedUsers, error: mentionError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', mentions);
          
        if (mentionError) throw mentionError;
        
        if (mentionedUsers && mentionedUsers.length > 0) {
          // Create notifications for each mentioned user
          const notificationsToInsert = mentionedUsers
            .filter(mentionedUser => mentionedUser.id !== user.id) // Don't notify yourself
            .map(mentionedUser => ({
              type: 'mention',
              user_id: mentionedUser.id,
              actor_id: user.id,
              post_id: postId,
              comment_id: commentData.id,
              read: false
            }));
          
          if (notificationsToInsert.length > 0) {
            // Insert all notifications
            const { error: notifyError } = await supabase
              .from('notifications')
              .insert(notificationsToInsert);
              
            if (notifyError) console.error('Error creating mention notifications:', notifyError);
          }
        }
        
        // Also notify the post owner about the comment (if not the same as commenter)
        if (postData && postData.user_id !== user.id) {
          const { error: ownerNotifyError } = await supabase
            .from('notifications')
            .insert({
              type: 'comment',
              user_id: postData.user_id,
              actor_id: user.id,
              post_id: postId,
              comment_id: commentData.id,
              read: false
            });
            
          if (ownerNotifyError) console.error('Error notifying post owner:', ownerNotifyError);
        }
      }
      
      // Clear form and update UI
      setContent('');
      toast.success('Comentário adicionado com sucesso');
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Erro ao adicionar comentário', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Faça login para comentar</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username || 'User'} />
          <AvatarFallback>{profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Escreva um comentário..."
            value={content}
            onChange={handleCommentChange}
            className="min-h-[60px] resize-none"
          />
          
          {isTypingMention && mentionResults.length > 0 && (
            <Card className="absolute left-0 right-0 mt-1 z-10 max-h-[180px] overflow-y-auto p-1">
              <div className="space-y-1">
                {mentionResults.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                    onClick={() => insertMention(user.username)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                      <AvatarFallback>{user.username[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{user.full_name || user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {isTypingMention && mentionQuery.length > 0 && mentionResults.length === 0 && (
            <Card className="absolute left-0 right-0 mt-1 z-10 p-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Search className="h-4 w-4" />
                <span className="text-sm">Nenhum usuário encontrado</span>
              </div>
            </Card>
          )}
        </div>
        
        <Button 
          type="submit" 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-full"
          disabled={isLoading || !content.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizonal className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;
