
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Save, CheckCircle } from 'lucide-react';

const ProfileForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const isVerified = username.toLowerCase() === 'outliersofc';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log('Profile updated');
    }, 1500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setProfileImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-panel p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground">Add your details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile preview" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <Button 
                type="button" 
                size="sm" 
                variant="secondary" 
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={() => document.getElementById('profile-image')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input 
                id="profile-image" 
                type="file" 
                className="hidden" 
                onChange={handleImageUpload}
                accept="image/*"
              />
            </div>
            <span className="text-sm text-muted-foreground">Upload a profile photo</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
              {isVerified && (
                <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-primary" />
              )}
            </div>
            {isVerified && (
              <p className="text-xs text-primary">
                Official Outliers account
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself or your business"
              disabled={isLoading}
              className="resize-none min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              placeholder="e.g., Technology, Marketing, Finance"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Social Media</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="LinkedIn Profile URL"
                disabled={isLoading}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Website URL"
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                <span>Save Profile</span>
              </div>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default ProfileForm;
