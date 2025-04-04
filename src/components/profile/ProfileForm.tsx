
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Save, CheckCircle, Camera, Trash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfileFormProps {
  initialData?: {
    username?: string;
    bio?: string;
    industry?: string;
    avatar_url?: string;
    linkedin_url?: string;
    website_url?: string;
    is_public?: boolean;
  };
  onSuccess?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState(initialData?.username || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [linkedin, setLinkedin] = useState(initialData?.linkedin_url || '');
  const [website, setWebsite] = useState(initialData?.website_url || '');
  const [isPublic, setIsPublic] = useState(initialData?.is_public !== false);
  const [avatar, setAvatar] = useState<string | null>(initialData?.avatar_url || null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isVerified = username.toLowerCase() === 'outliersofc';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Nome de usuário é obrigatório');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let avatarUrl = avatar;
      
      // If there's a new image to upload
      if (uploadPreview && user) {
        const file = await (await fetch(uploadPreview)).blob();
        const fileExt = 'jpg';
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        // Upload the image
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      }
      
      // Update profile in database
      const { error } = await supabase.from('profiles').upsert({
        id: user?.id,
        username,
        bio,
        industry,
        linkedin_url: linkedin,
        website_url: website,
        avatar_url: avatarUrl,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      
      toast.success('Perfil atualizado com sucesso!');
      setAvatar(avatarUrl);
      setUploadPreview(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setUploadPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="glass-panel p-6 bg-card border border-border rounded-lg shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center shadow-md border border-border">
                {uploadPreview ? (
                  <img 
                    src={uploadPreview} 
                    alt="Pré-visualização do perfil" 
                    className="h-full w-full object-cover"
                  />
                ) : avatar ? (
                  <img 
                    src={avatar} 
                    alt="Foto de perfil" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <Button 
                type="button" 
                size="sm" 
                variant="secondary" 
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input 
                ref={fileInputRef}
                id="profile-image" 
                type="file" 
                className="hidden" 
                onChange={handleImageUpload}
                accept="image/*"
              />
            </div>
            {uploadPreview && (
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={removeImage}
                className="text-xs flex items-center gap-1"
              >
                <Trash className="h-3 w-3" /> Remover
              </Button>
            )}
            <span className="text-sm text-muted-foreground">Selecione uma foto de perfil</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">Nome de Usuário</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="Escolha um nome de usuário único"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="bg-background text-foreground border-input"
              />
              {isVerified && (
                <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-primary" />
              )}
            </div>
            {isVerified && (
              <p className="text-xs text-primary">
                Conta oficial Outliers
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-foreground">Biografia</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre você ou sua empresa"
              disabled={isLoading}
              className="resize-none min-h-[100px] bg-background text-foreground border-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry" className="text-foreground">Área de Atuação</Label>
            <Input
              id="industry"
              placeholder="Ex: Tecnologia, Marketing, Finanças"
              disabled={isLoading}
              className="bg-background text-foreground border-input"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Redes Sociais</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="URL do LinkedIn"
                disabled={isLoading}
                className="pl-10 bg-background text-foreground border-input"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
              />
            </div>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="URL do Website"
                disabled={isLoading}
                className="pl-10 bg-background text-foreground border-input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={isPublic} 
                onChange={() => setIsPublic(!isPublic)}
                className="w-4 h-4"
              />
              <span>Perfil Público</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              {isPublic ? "Seu perfil pode ser visto por todos" : "Seu perfil só pode ser visto pelas suas conexões"}
            </p>
          </div>

          <Button 
            type="submit" 
            className={cn(
              "w-full bg-primary text-primary-foreground hover:bg-primary/90",
              isLoading && "opacity-70 cursor-not-allowed"
            )} 
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Salvando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                <span>Salvar Perfil</span>
              </div>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default ProfileForm;
