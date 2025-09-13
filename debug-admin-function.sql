-- Debug script for admin_get_all_users function
-- Run these queries one by one in Supabase SQL Editor to identify the issue

-- 1. Check if the admin user exists and has correct role
SELECT 'Admin user check:' as info;
SELECT user_id, email, username, role 
FROM public.profiles 
WHERE role IN ('admin', 'super_admin');

-- 2. Check current authenticated user (this should show your admin user)
SELECT 'Current auth user:' as info;
SELECT auth.uid() as current_user_id;

-- 3. Test the is_admin function directly
SELECT 'Is admin function test:' as info;
SELECT public.is_admin() as is_admin_result;

-- 4. Test the admin_get_all_users function directly
SELECT 'Admin function test:' as info;
SELECT * FROM public.admin_get_all_users();

-- 5. Check if there are any users in profiles table
SELECT 'All profiles:' as info;
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- 6. Check if there are any API keys
SELECT 'All API keys:' as info;
SELECT id, user_id, name, key_value, is_active, status 
FROM public.api_keys 
ORDER BY created_at DESC;

-- 7. Check RLS policies on profiles table
SELECT 'RLS policies on profiles:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 8. Check RLS policies on api_keys table
SELECT 'RLS policies on api_keys:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'api_keys';
