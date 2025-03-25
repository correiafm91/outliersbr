import React, { useState, useRef, useEffect } from 'react';
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
    full_name?: string;
    is_public?: boolean;
    banner_url?: string;
  };
  onSuccess?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onSuccess }) => {
  const { user, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState(initialData?.username || '');
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [linkedin, setLinkedin] = useState(initialData?.linkedin_url || '');
  const [website, setWebsite] = useState(initialData?.website_url || '');
  const [isPublic, setIsPublic] = useState(initialData?.is_public !== false);
  const [avatar, setAvatar] = useState<string | null>(initialData?.avatar_url || null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bannerUrl, setBannerUrl] = useState(initialData?.banner_url || null);
  const [bannerUploadPreview, setBannerUploadPreview] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  
  const isVerified = username.toLowerCase() === 'outliersofc';

  useEffect(() => {
    const checkUsername = async () => {
      if (username && username !== initialData?.username) {
        if (username.length < 3) {
          setUsernameError('O nome de usuário deve ter pelo menos 3 caracteres');
          return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          setUsernameError('O nome de usuário deve conter apenas letras, números e sublinhados');
          return;
        }
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .neq('id', user?.id || '')
            .maybeSingle();
            
          if (error) throw error;
          
          if (data) {
            setUsernameError('Este nome de usuário já está em uso');
          } else {
            setUsernameError(null);
          }
        } catch (error) {
          console.error('Error checking username:', error);
        }
      } else {
        setUsernameError(null);
      }
    };
    
    checkUsername();
  }, [username, initialData?.username, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Nome de usuário é obrigatório');
      return;
    }
    
    if (usernameError) {
      toast.error(usernameError);
      return;
    }
    
    setIsLoading(true);
    
    try {
      let avatarUrl = avatar;
      
      if (uploadPreview && user) {
        const file = await (await fetch(uploadPreview)).blob();
        const fileExt = 'jpg';
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      }
      
      let bannerImageUrl = bannerUrl;
      
      if (bannerUploadPreview && user) {
        const file = await (await fetch(bannerUploadPreview)).blob();
        const fileExt = 'jpg';
        const fileName = `banner-${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('banners')
          .upload(filePath, file, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(filePath);
          
        bannerImageUrl = publicUrl;
      }
      
      const { error } = await supabase.from('profiles').upsert({
        id: user?.id,
        username,
        full_name: fullName,
        bio,
        industry,
        linkedin_url: linkedin,
        website_url: website,
        avatar_url: avatarUrl,
        banner_url: bannerImageUrl,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      
      toast.success('Perfil atualizado com sucesso!');
      setAvatar(avatarUrl);
      setUploadPreview(null);
      setBannerUrl(bannerImageUrl);
      setBannerUploadPreview(null);
      
      await refreshProfile();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
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

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setBannerUploadPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBannerImage = () => {
    setBannerUploadPreview(null);
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="glass-panel p-6 bg-gray-900 border border-gray-800 rounded-lg shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center shadow-md border border-gray-700">
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
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-gray-700 hover:bg-gray-600"
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

          <div className="space-y-4 mt-6">
            <Label className="text-foreground">Banner do Perfil</Label>
            <div className="relative">
              <div className="h-32 w-full rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                {bannerUploadPreview ? (
                  <img 
                    src={bannerUploadPreview} 
                    alt="Pré-visualização do banner" 
                    className="h-full w-full object-cover"
                  />
                ) : bannerUrl ? (
                  <img 
                    src={bannerUrl} 
                    alt="Banner de perfil" 
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
                className="absolute bottom-2 right-2 rounded-full p-2 bg-gray-700 hover:bg-gray-600"
                onClick={() => bannerFileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input 
                ref={bannerFileInputRef}
                id="banner-image" 
                type="file" 
                className="hidden" 
                onChange={handleBannerUpload}
                accept="image/*"
              />
            </div>
            {bannerUploadPreview && (
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={removeBannerImage}
                className="text-xs flex items-center gap-1"
              >
                <Trash className="h-3 w-3" /> Remover Banner
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              O banner será exibido no topo do seu perfil
            </span>
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
                className="bg-gray-800 text-foreground border-gray-700"
              />
              {isVerified && (
                <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-primary" />
              )}
            </div>
            {usernameError && (
              <p className="text-xs text-red-400">
                {usernameError}
              </p>
            )}
            {isVerified && (
              <p className="text-xs text-primary">
                Conta oficial Outliers
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Nome Completo</Label>
            <Input
              id="fullName"
              placeholder="Seu nome completo ou nome da empresa"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              className="bg-gray-800 text-foreground border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-foreground">Biografia</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre você ou sua empresa"
              disabled={isLoading}
              className="resize-none min-h-[100px] bg-gray-800 text-foreground border-gray-700"
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
              className="bg-gray-800 text-foreground border-gray-700"
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
                className="pl-10 bg-gray-800 text-foreground border-gray-700"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
              />
            </div>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="URL do Website"
                disabled={isLoading}
                className="pl-10 bg-gray-800 text-foreground border-gray-700"
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
