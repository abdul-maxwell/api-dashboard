-- Debug admin privileges issue
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check who you're authenticated as
SELECT 'Current authenticated user:' as info;
SELECT auth.uid() as current_user_id;

-- 2. Check all users in profiles table
SELECT 'All profiles:' as info;
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- 3. Check if there are any admin users
SELECT 'Admin users:' as info;
SELECT user_id, email, username, role 
FROM public.profiles 
WHERE role IN ('admin', 'super_admin');

-- 4. Test the is_admin function
SELECT 'Is admin function test:' as info;
SELECT public.is_admin() as is_admin_result;

-- 5. Test the is_admin function with specific user ID
SELECT 'Is admin function with current user:' as info;
SELECT public.is_admin(auth.uid()) as is_admin_with_current_user;

-- 6. Check if your current user ID matches any profile
SELECT 'Current user profile check:' as info;
SELECT 
  p.user_id,
  p.email,
  p.username,
  p.role,
  (p.user_id = auth.uid()) as is_current_user
FROM public.profiles p
WHERE p.user_id = auth.uid();

-- 7. Check auth.users table (if accessible)
SELECT 'Auth users (if accessible):' as info;
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@zetechmd.com';

-- 8. Manual check of is_admin logic
SELECT 'Manual admin check:' as info;
SELECT 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) as manual_admin_check;

