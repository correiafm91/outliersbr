
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

interface ShareProfileButtonProps {
  username: string;
  fullName?: string | null;
  variant?: "default" | "outline" | "ghost" | "icon";
  className?: string;
}

const ShareProfileButton: React.FC<ShareProfileButtonProps> = ({ 
  username, 
  fullName, 
  variant = "ghost", 
  className = "" 
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const profileUrl = `${window.location.origin}/profile/${username}`;
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Perfil de ${fullName || username} - Outliers`,
        text: `Confira o perfil de ${fullName || username} no Outliers!`,
        url: profileUrl
      }).catch(err => {
        console.error('Error sharing:', err);
        setIsPopoverOpen(true);
      });
    } else {
      setIsPopoverOpen(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setIsCopied(true);
      toast.success('Link copiado para a área de transferência');
      
      setTimeout(() => {
        setIsCopied(false);
        setIsPopoverOpen(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast.error('Erro ao copiar link');
    });
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleShare}
            className={className}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            variant={variant} 
            size="sm" 
            onClick={handleShare}
            className={className}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-gray-900 border-gray-800">
        <div className="space-y-4">
          <h3 className="font-medium text-white">Compartilhar perfil</h3>
          <div className="flex items-center">
            <input
              className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded-l-md text-white text-sm"
              value={profileUrl}
              readOnly
            />
            <Button
              variant="default"
              size="sm"
              className="rounded-l-none"
              onClick={copyToClipboard}
            >
              {isCopied ? (
                <CheckCheck className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShareProfileButton;
