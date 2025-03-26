
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Image, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface BannerUploadProps {
  userId: string;
  currentBanner: string | null;
  onBannerChange: (url: string | null) => void;
}

const BannerUpload: React.FC<BannerUploadProps> = ({ userId, currentBanner, onBannerChange }) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const canEdit = user?.id === userId;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    
    // Basic validation
    if (file.size > 3 * 1024 * 1024) {
      toast.error('O arquivo é muito grande', {
        description: 'O tamanho máximo permitido é 3MB'
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Tipo de arquivo inválido', {
        description: 'Por favor, selecione uma imagem'
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsUploading(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${userId}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('profile_images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile_images')
        .getPublicUrl(fileName);

      // Update profile with new banner URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onBannerChange(publicUrl);
      toast.success('Banner atualizado com sucesso');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast.error('Erro ao atualizar banner', {
        description: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeBanner = async () => {
    if (!canEdit) return;

    try {
      setIsUploading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ banner_url: null })
        .eq('id', userId);

      if (error) throw error;

      onBannerChange(null);
      toast.success('Banner removido com sucesso');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error removing banner:', error);
      toast.error('Erro ao remover banner', {
        description: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!canEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white"
        >
          <Image className="h-4 w-4 mr-2" />
          {currentBanner ? 'Alterar Banner' : 'Adicionar Banner'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentBanner ? 'Alterar Banner' : 'Adicionar Banner'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl && (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-40 object-cover rounded-md"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full h-8 w-8 p-1"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => document.getElementById('banner-upload')?.click()}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Image className="h-4 w-4 mr-2" />}
              Selecionar Imagem
            </Button>

            {currentBanner && (
              <Button 
                variant="destructive" 
                disabled={isUploading}
                onClick={removeBanner}
              >
                <X className="h-4 w-4 mr-2" />
                Remover Banner
              </Button>
            )}
          </div>

          <input
            id="banner-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="text-xs text-muted-foreground">
            Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 3MB.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BannerUpload;
