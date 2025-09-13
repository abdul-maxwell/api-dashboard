-- Add missing columns to profiles table
-- Create user_role enum first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin');
    END IF;
END $$;

-- Add missing columns to profiles table
DO $$
BEGIN
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';
    END IF;
END $$;

-- Update existing profiles to have default values
UPDATE public.profiles 
SET 
    username = COALESCE(username, 'user_' || substring(user_id::text, 1, 8)),
    role = COALESCE(role, 'user'::user_role)
WHERE username IS NULL OR role IS NULL;

-- Make username and role NOT NULL after setting defaults
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN role SET NOT NULL;
