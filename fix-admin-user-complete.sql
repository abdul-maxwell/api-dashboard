-- Complete fix for admin user creation
-- Run these queries in order in Supabase SQL Editor

-- Step 1: Check if admin user exists in auth.users
SELECT 'Checking auth users:' as info;
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@zetechmd.com';

-- Step 2: If the above returns a user, get their ID and create/update profile
-- Replace 'USER_ID_HERE' with the actual ID from step 1
/*
INSERT INTO public.profiles (user_id, email, username, role, created_at)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'admin@zetechmd.com',
  'admin',
  'admin',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  username = 'admin',
  email = 'admin@zetechmd.com';
*/

-- Step 3: Alternative - Create profile for any existing auth user with admin email
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
  username = 'admin',
  email = 'admin@zetechmd.com';

-- Step 4: Verify the admin user was created
SELECT 'Verification - Admin user:' as info;
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
WHERE role = 'admin';

-- Step 5: Test the is_admin function again
SELECT 'Test is_admin function:' as info;
SELECT public.is_admin() as is_admin_result;

-- Step 6: Test the admin function
SELECT 'Test admin function:' as info;
SELECT * FROM public.admin_get_all_users();
