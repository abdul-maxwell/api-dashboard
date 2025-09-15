-- Debug Admin Users Issue
-- This will help us see what's happening with the admin dashboard

-- 1. Check all users in profiles table
SELECT 
  'All Profiles' as check_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user_id,
  COUNT(*) FILTER (WHERE user_id IS NULL) as without_user_id
FROM public.profiles;

-- 2. Show all profiles with details
SELECT 
  user_id,
  email,
  username,
  role,
  created_at,
  CASE 
    WHEN user_id IS NULL THEN 'PENDING_SIGNUP'
    ELSE 'ACTIVE'
  END as status
FROM public.profiles
ORDER BY created_at DESC;

-- 3. Check auth.users table
SELECT 
  'Auth Users' as check_type,
  COUNT(*) as total_count
FROM auth.users;

-- 4. Show auth users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 5. Test the admin function
SELECT 
  'Admin Function Test' as test_type,
  public.is_admin() as is_current_user_admin;

-- 6. Test admin_get_all_users function
SELECT public.admin_get_all_users(50, 0, NULL) as admin_users_result;

-- 7. Check if there are any RLS policies blocking access
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';
