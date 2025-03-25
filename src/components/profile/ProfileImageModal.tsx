
import React from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ProfileImageModalProps {
  imageUrl: string | null;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

const ProfileImageModal: React.FC<ProfileImageModalProps> = ({ 
  imageUrl, 
  username, 
  isOpen, 
  onClose 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-gray-800 bg-black">
        <div className="relative w-full overflow-hidden rounded-lg">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={`${username}'s profile`} 
              className="w-full h-auto object-contain max-h-[80vh]" 
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-gray-900 text-gray-400">
              No profile image available
            </div>
          )}
        </div>
        <DialogClose asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 rounded-full bg-black/50 text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileImageModal;
