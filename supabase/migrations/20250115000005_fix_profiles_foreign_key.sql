-- Fix the profiles table foreign key constraint issue
-- First, let's check if we need to modify the constraint

-- Drop the existing foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profile_user_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profile_user_id_fkey;
    END IF;
END $$;

-- Make user_id nullable temporarily to allow profile creation without auth user
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Add a new foreign key constraint that allows NULL values
-- This will be enforced when user_id is not NULL
ALTER TABLE public.profiles 
ADD CONSTRAINT profile_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
