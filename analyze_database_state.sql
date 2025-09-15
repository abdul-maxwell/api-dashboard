-- Analyze Current Database State
-- This will help us understand what's currently in the database and identify conflicts

-- 1. Check what tables exist
SELECT 
  'Tables' as check_type,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check what functions exist
SELECT 
  'Functions' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%admin%' OR routine_name LIKE '%package%' OR routine_name LIKE '%discount%'
ORDER BY routine_name;

-- 3. Check packages table structure
SELECT 
  'Packages Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'packages'
ORDER BY ordinal_position;

-- 4. Check packages data
SELECT 
  'Packages Data' as check_type,
  id,
  name,
  price_ksh,
  original_price_ksh,
  is_active,
  created_at
FROM public.packages
ORDER BY created_at DESC;

-- 5. Check discounts table structure
SELECT 
  'Discounts Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'discounts'
ORDER BY ordinal_position;

-- 6. Check discounts data
SELECT 
  'Discounts Data' as check_type,
  id,
  promo_code,
  name,
  discount_type,
  discount_value,
  is_active,
  created_at
FROM public.discounts
ORDER BY created_at DESC;

-- 7. Check profiles table structure
SELECT 
  'Profiles Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 8. Check profiles data
SELECT 
  'Profiles Data' as check_type,
  user_id,
  email,
  username,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 9. Check api_keys table structure
SELECT 
  'API Keys Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 10. Check api_keys data
SELECT 
  'API Keys Data' as check_type,
  id,
  user_id,
  name,
  key_value,
  is_active,
  is_trial,
  payment_status,
  created_at
FROM public.api_keys
ORDER BY created_at DESC;

-- 11. Check RLS policies
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 12. Check if admin user exists and is working
SELECT 
  'Admin User Check' as check_type,
  p.user_id,
  p.email,
  p.username,
  p.role,
  public.is_admin(p.user_id) as is_admin_check
FROM public.profiles p
WHERE p.email = 'admin@zetechmd.com';

-- 13. Test admin functions
SELECT 
  'Admin Functions Test' as test_type,
  public.admin_get_all_users(10, 0, NULL) as users_result;

-- 14. Test package functions
SELECT 
  'Package Functions Test' as test_type,
  public.get_packages() as packages_result;

-- 15. Check for any errors in recent functions
SELECT 
  'Function Errors' as check_type,
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('admin_get_all_users', 'get_packages', 'admin_get_packages', 'admin_get_discounts')
ORDER BY routine_name;
