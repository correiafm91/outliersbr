
-- Function to create comment_likes table if it doesn't exist
CREATE OR REPLACE FUNCTION create_comment_likes_if_not_exists()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'comment_likes'
  ) THEN
    -- Create comment_likes table
    CREATE TABLE public.comment_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      comment_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Add unique constraint to prevent duplicate likes
    ALTER TABLE public.comment_likes
    ADD CONSTRAINT unique_comment_like UNIQUE (user_id, comment_id);
  END IF;
END;
$$;

-- Function to create notifications table if it doesn't exist
CREATE OR REPLACE FUNCTION create_notifications_if_not_exists()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    -- Create notifications table
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
      comment_id UUID,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Add index for faster querying by user_id
    CREATE INDEX notifications_user_id_idx ON public.notifications(user_id);
    
    -- Add index for read status
    CREATE INDEX notifications_read_idx ON public.notifications(read);
  END IF;
END;
$$;

-- Function to alter profiles table to add banner_url if it doesn't exist
CREATE OR REPLACE FUNCTION add_banner_to_profiles_if_not_exists()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name = 'banner_url'
  ) THEN
    -- Add banner_url column to profiles table
    ALTER TABLE public.profiles
    ADD COLUMN banner_url TEXT;
  END IF;
END;
$$;

-- Execute the function to ensure banner_url exists
SELECT add_banner_to_profiles_if_not_exists();
