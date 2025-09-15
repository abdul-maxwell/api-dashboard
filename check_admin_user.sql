-- Check Admin User Status
-- Run this to see the current state of your admin user

-- 1. Check if admin user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'admin@zetechmd.com';

-- 2. Check if admin profile exists in profiles table
SELECT 
  p.user_id,
  p.email,
  p.username,
  p.role,
  au.email as auth_email,
  au.email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
WHERE p.email = 'admin@zetechmd.com';

-- 3. Check if profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) as profiles_table_exists;

-- 4. Check if user_role enum exists
SELECT EXISTS (
  SELECT FROM pg_type 
  WHERE typname = 'user_role'
) as user_role_enum_exists;
