-- Fix profiles table constraints to allow NULL user_id
-- This migration specifically addresses the foreign key constraint violation

-- First, let's check and drop any existing foreign key constraints
DO $$
BEGIN
    -- Drop the existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profile_user_id_fkey' 
        AND table_name = 'profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profile_user_id_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint profile_user_id_fkey';
    END IF;
END $$;

-- Make user_id nullable if it's not already
DO $$
BEGIN
    -- Check if user_id is NOT NULL and make it nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE 'Made user_id column nullable';
    END IF;
END $$;

-- Add a new foreign key constraint that allows NULL values
-- This will only enforce the constraint when user_id is not NULL
ALTER TABLE public.profiles 
ADD CONSTRAINT profile_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id) WHERE user_id IS NOT NULL;

-- Add a comment to document the constraint behavior
COMMENT ON CONSTRAINT profile_user_id_fkey ON public.profiles IS 
'Foreign key constraint that allows NULL user_id for pending profiles. Only enforced when user_id is not NULL.';
