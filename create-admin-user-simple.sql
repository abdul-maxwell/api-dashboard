-- Simple script to create admin user
-- Run this directly in Supabase SQL Editor

-- Step 1: First create the auth user in Supabase Dashboard
-- Go to Authentication > Users > Add user
-- Email: admin@zetechmd.com
-- Password: Admin@BSE2025
-- Auto Confirm User: ✅

-- Step 2: Then run this SQL to create the profile
INSERT INTO public.profiles (user_id, email, username, role, created_at)
SELECT 
  au.id,
  au.email,
  'admin',
  'admin',
  au.created_at
FROM auth.users au
WHERE au.email = 'admin@zetechmd.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  username = 'admin';

-- Step 3: Verify the admin user was created
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
WHERE role = 'admin';
