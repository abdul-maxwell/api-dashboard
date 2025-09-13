-- Fix admin user setup
-- This script handles the case where a user with username 'admin' already exists

-- First, let's see what users exist
SELECT 'Current users:' as info;
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- Check if there's already an admin user
SELECT 'Existing admin users:' as info;
SELECT user_id, email, username, role 
FROM public.profiles 
WHERE role IN ('admin', 'super_admin');

-- Option 1: If you want to update the existing user with username 'admin' to be an admin
-- Uncomment and run this if the existing user should become an admin:
/*
UPDATE public.profiles 
SET role = 'admin', email = 'admin@zetechmd.com'
WHERE username = 'admin';
*/

-- Option 2: If you want to create a new admin user with a different username
-- First, create the auth user in Supabase dashboard with email: admin@zetechmd.com
-- Then run this to create the profile:
/*
INSERT INTO public.profiles (user_id, email, username, role, created_at)
SELECT 
  au.id,
  au.email,
  'admin_user',  -- Different username to avoid conflict
  'admin',
  au.created_at
FROM auth.users au
WHERE au.email = 'admin@zetechmd.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  username = 'admin_user';
*/

-- Option 3: If you want to delete the existing user and create a new one
-- WARNING: This will delete the existing user and all their data!
-- Uncomment only if you're sure:
/*
-- Delete existing user with username 'admin'
DELETE FROM public.profiles WHERE username = 'admin';
-- Then create the new admin user as in Option 2
*/
