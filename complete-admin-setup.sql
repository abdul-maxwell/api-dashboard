-- Complete admin setup - run these queries in order
-- Make sure you're logged in as the admin user in your application first

-- Step 1: Check current authentication
SELECT 'Step 1 - Current user:' as info;
SELECT auth.uid() as current_user_id;

-- Step 2: Check if admin user exists in auth.users
SELECT 'Step 2 - Auth users:' as info;
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@zetechmd.com';

-- Step 3: Check profiles table
SELECT 'Step 3 - All profiles:' as info;
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- Step 4: Create admin profile (run this if admin user exists in auth.users but not in profiles)
-- Uncomment and run this if needed:
/*
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
*/

-- Step 5: Verify admin user exists
SELECT 'Step 5 - Admin user verification:' as info;
SELECT user_id, email, username, role 
FROM public.profiles 
WHERE role = 'admin';

-- Step 6: Test is_admin function
SELECT 'Step 6 - Is admin test:' as info;
SELECT public.is_admin() as is_admin_result;

-- Step 7: Test admin function
SELECT 'Step 7 - Admin function test:' as info;
SELECT * FROM public.admin_get_all_users();
