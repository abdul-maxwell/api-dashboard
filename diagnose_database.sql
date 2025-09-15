-- Database Diagnosis - Check what's broken
-- Run this to see what tables exist and what data is missing

-- 1. Check what tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if profiles table exists and has data
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'EMPTY' END as status
FROM public.profiles
UNION ALL
SELECT 
  'api_keys' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'EMPTY' END as status
FROM public.api_keys
UNION ALL
SELECT 
  'transactions' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'EMPTY' END as status
FROM public.transactions
UNION ALL
SELECT 
  'payments' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'EMPTY' END as status
FROM public.payments
UNION ALL
SELECT 
  'notifications' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'EMPTY' END as status
FROM public.notifications;

-- 3. Check if packages table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'packages') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as packages_table_status;

-- 4. Check if discounts table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discounts') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as discounts_table_status;

-- 5. Check users in profiles table
SELECT 
  user_id,
  email,
  username,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 6. Check if admin user exists
SELECT 
  'Admin User Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin@zetechmd.com' AND role = 'admin') 
    THEN 'ADMIN EXISTS' 
    ELSE 'ADMIN MISSING' 
  END as status;

-- 7. Check if is_admin function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_admin' AND routine_schema = 'public') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as is_admin_function_status;
