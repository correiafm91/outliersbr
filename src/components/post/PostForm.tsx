
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Image as ImageIcon, 
  Video, 
  X, 
  Loader2, 
  Tag,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

const PostForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ url: string; type: 'image' | 'video'; file: File }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 4) {
        toast.error('Máximo de 4 arquivos permitidos');
        return;
      }

      setSelectedFiles(prev => [...prev, ...newFiles]);

      // Create preview URLs
      const newPreviews = newFiles.map(file => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        return { url, type, file };
      });

      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index].url);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleTagAdd = () => {
    if (tagInput && !tags.includes(tagInput)) {
      if (tags.length >= 5) {
        toast.error('Máximo de 5 tags');
        return;
      }
      
      const formattedTag = tagInput.startsWith('#') ? tagInput : `#${tagInput}`;
      setTags([...tags, formattedTag]);
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Por favor, adicione um texto à sua publicação');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload media files if any
      const mediaUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `${user!.id}/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('posts')
            .upload(filePath, file);

          if (uploadError) {
            throw uploadError;
          }

          const { data: publicURL } = supabase.storage
            .from('posts')
            .getPublicUrl(filePath);

          mediaUrls.push(publicURL.publicUrl);
        }
      }

      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user!.id,
          content,
          images: mediaUrls,
          is_public: isPublic,
          tags: tags.length > 0 ? tags : null
        })
        .select()
        .single();

      if (postError) {
        throw postError;
      }

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Textarea
          placeholder="O que você gostaria de compartilhar?"
          className="min-h-[150px] text-foreground"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
        />
        
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || selectedFiles.length >= 4}
          >
            <Upload className="mr-2 h-4 w-4" />
            Adicionar Mídia
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isSubmitting}
              id="is-public"
            />
            <Label htmlFor="is-public" className="cursor-pointer">
              {isPublic ? 'Público' : 'Privado'}
            </Label>
          </div>
        </div>
        
        {/* Tag input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Adicionar tag (ex: #networking)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTagAdd();
                }
              }}
              disabled={isSubmitting}
              className="pr-10"
            />
            {tagInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleTagAdd}
                disabled={isSubmitting}
              >
                <Tag className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Tags display */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center text-sm"
              >
                {tag}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 ml-1"
                  onClick={() => removeTag(index)}
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Preview area */}
        {previewUrls.length > 0 && (
          <div className={`grid gap-2 ${previewUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {previewUrls.map((preview, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden bg-black/5 aspect-video">
                {preview.type === 'image' ? (
                  <img
                    src={preview.url}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={preview.url}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full"
                  onClick={() => removeFile(index)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publicando...
            </>
          ) : (
            'Publicar'
          )}
        </Button>
      </div>
    </form>
  );
};

export default PostForm;
