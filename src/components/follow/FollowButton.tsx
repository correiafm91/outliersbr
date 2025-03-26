
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const FollowButton: React.FC<FollowButtonProps> = ({ 
  targetUserId, 
  onFollowChange,
  className,
  variant = 'default',
  size = 'default'
}) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || user.id === targetUserId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        if (error) throw error;
        setIsFollowing(!!data);
      } catch (error: any) {
        console.error('Error checking follow status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowStatus();
  }, [user, targetUserId]);

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para seguir usuários');
      return;
    }

    setIsLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
        setIsFollowing(false);
        toast.success('Você deixou de seguir este usuário');
        if (onFollowChange) onFollowChange(false);
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success('Você começou a seguir este usuário');
        if (onFollowChange) onFollowChange(true);
      }
    } catch (error: any) {
      console.error('Error toggling follow status:', error);
      toast.error('Erro ao alterar status de seguir', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.id === targetUserId) {
    return null; // Don't show follow button for own profile
  }

  return (
    <Button
      onClick={handleFollowToggle}
      disabled={isLoading || !user}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          Seguindo
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Seguir
        </>
      )}
    </Button>
  );
};

export default FollowButton;
