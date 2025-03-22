
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Image, X, Video, File, Loader2, Tag, Globe, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

type MediaType = "image" | "video";

interface MediaFile {
  url: string;
  type: MediaType;
  file: File;
}

const PostForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      if (mediaFiles.length + files.length > 5) {
        toast.error('Máximo de 5 arquivos permitidos');
        return;
      }
      
      files.forEach(file => {
        if (file.size > 20 * 1024 * 1024) { // 20MB limit
          toast.error(`O arquivo ${file.name} é muito grande (máximo 20MB)`);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const type: MediaType = file.type.startsWith('image/') ? 'image' : 'video';
            
            setMediaFiles(prev => [
              ...prev, 
              { 
                url: e.target!.result as string, 
                type, 
                file 
              }
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      if (tags.length >= 5) {
        toast.error('Máximo de 5 tags permitidas');
        return;
      }
      
      const formatted = tagInput.trim().startsWith('#') 
        ? tagInput.trim() 
        : `#${tagInput.trim()}`;
        
      setTags([...tags, formatted]);
      setTagInput('');
    }
  };
  
  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para publicar');
      navigate('/');
      return;
    }
    
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Adicione texto ou mídia à sua publicação');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      let imageUrls: string[] = [];
      
      // Upload images if any
      if (mediaFiles.length > 0) {
        for (const mediaFile of mediaFiles) {
          const fileExt = mediaFile.file.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('posts')
            .upload(fileName, mediaFile.file);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);
            
          imageUrls.push(publicUrl);
        }
      }
      
      // Create post
      const { error } = await supabase
        .from('posts')
        .insert({
          content: content.trim(),
          user_id: user.id,
          images: imageUrls,
          tags: tags.length > 0 ? tags : null,
          is_public: isPublic
        });
        
      if (error) throw error;
      
      toast.success('Publicação criada com sucesso!');
      navigate('/');
    } catch (error: any) {
      toast.error('Erro ao criar publicação', {
        description: error.message,
      });
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-4">
        <Textarea
          placeholder="O que você quer compartilhar?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[150px] text-base resize-none"
          disabled={isSubmitting}
        />
        
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative rounded-md overflow-hidden border border-border h-40">
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt={`Uploaded ${index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={media.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 bg-background/80 text-foreground p-1 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || mediaFiles.length >= 5}
          >
            <Image className="h-4 w-4 mr-2" />
            <span>Mídia</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleMediaChange}
            disabled={isSubmitting}
          />
          
          <div className="flex items-center ml-auto">
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isSubmitting}
              id="post-visibility"
            />
            <Label htmlFor="post-visibility" className="ml-2 flex items-center">
              {isPublic ? (
                <>
                  <Globe className="h-4 w-4 mr-1" />
                  <span className="text-xs">Público</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  <span className="text-xs">Privado</span>
                </>
              )}
            </Label>
          </div>
        </div>
      </Card>
      
      <div>
        <Label htmlFor="tags">Tags (opcional)</Label>
        <div className="flex mt-2">
          <Input
            id="tags"
            placeholder="Adicione tags (ex: #networking)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            disabled={isSubmitting || tags.length >= 5}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTag}
            disabled={isSubmitting || !tagInput.trim() || tags.length >= 5}
            className="ml-2"
          >
            <Tag className="h-4 w-4" />
          </Button>
        </div>
        
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((tag) => (
              <motion.span
                key={tag}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-primary/10 border border-primary/20 text-primary rounded-full px-3 py-1 text-sm flex items-center"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 focus:outline-none"
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </div>
        )}
      </div>
      
      <Button
        type="submit"
        disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Publicando...
          </>
        ) : (
          'Publicar'
        )}
      </Button>
    </form>
  );
};

export default PostForm;
