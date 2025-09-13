-- Test the admin function step by step
-- Run these in order in Supabase SQL Editor

-- 1. Check if you're authenticated as admin
SELECT 
  auth.uid() as current_user_id,
  public.is_admin() as is_admin_result;

-- 2. If is_admin() returns false, check why
SELECT 
  p.user_id,
  p.email,
  p.username,
  p.role,
  (p.user_id = auth.uid()) as is_current_user
FROM public.profiles p
WHERE p.role IN ('admin', 'super_admin');

-- 3. Test the function directly
SELECT * FROM public.admin_get_all_users();

-- 4. If the function fails, try a simpler version
SELECT 
  p.user_id,
  p.email,
  p.username,
  p.role,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC;
