-- Fix Admin Users Display Issue - Version 2
-- This will fix the admin dashboard not showing all users without ON CONFLICT issues

-- Step 1: Check and fix RLS policies for profiles table
-- Drop existing policies that might be blocking admin access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies that allow admin access
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin());

-- Step 2: Fix the admin_get_all_users function to bypass RLS
CREATE OR REPLACE FUNCTION public.admin_get_all_users(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  users_result JSON;
  total_count INTEGER;
  admin_user_id UUID;
BEGIN
  -- Check if current user is admin
  admin_user_id := auth.uid();
  IF NOT public.is_admin(admin_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied. Admin privileges required.'
    );
  END IF;

  -- Get total count (bypass RLS with SECURITY DEFINER)
  SELECT COUNT(*) INTO total_count
  FROM public.profiles p
  WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.username ILIKE '%' || p_search || '%');

  -- Get users with their API key counts (bypass RLS with SECURITY DEFINER)
  SELECT json_agg(
    json_build_object(
      'user_id', p.user_id,
      'email', p.email,
      'username', p.username,
      'role', p.role,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'api_key_count', COALESCE(ak_count.count, 0),
      'active_api_keys', COALESCE(ak_count.active_count, 0),
      'status', CASE 
        WHEN p.user_id IS NULL THEN 'pending_signup'
        ELSE 'active'
      END
    ) ORDER BY p.created_at DESC
  ) INTO users_result
  FROM (
    SELECT p.*
    FROM public.profiles p
    WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.username ILIKE '%' || p_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) p
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE is_active = true) as active_count
    FROM public.api_keys
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) ak_count ON p.user_id = ak_count.user_id;

  RETURN json_build_object(
    'success', true,
    'users', COALESCE(users_result, '[]'::json),
    'total_count', total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- Step 3: Create test users without ON CONFLICT
-- First, check if test users already exist
DO $$
BEGIN
  -- Create test profile 1 (pending signup user)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'test@example.com') THEN
    INSERT INTO public.profiles (
      user_id,
      email,
      username,
      role,
      created_at,
      updated_at
    ) VALUES (
      NULL, -- This will be a pending signup user
      'test@example.com',
      'testuser',
      'user',
      now(),
      now()
    );
  END IF;

  -- Create test profile 2 (active user)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'active@example.com') THEN
    INSERT INTO public.profiles (
      user_id,
      email,
      username,
      role,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(), -- This will be an active user
      'active@example.com',
      'activeuser',
      'user',
      now(),
      now()
    );
  END IF;
END $$;

-- Step 4: Test the admin function
SELECT 
  'Admin Function Test' as test_type,
  public.is_admin() as is_current_user_admin,
  auth.uid() as current_user_id;

-- Step 5: Test the admin_get_all_users function
SELECT public.admin_get_all_users(50, 0, NULL) as admin_users_result;

-- Step 6: Show all profiles to verify they exist
SELECT 
  'All Profiles After Fix' as check_type,
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

-- Step 7: Show count of users
SELECT 
  'User Count Summary' as summary_type,
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as active_users,
  COUNT(*) FILTER (WHERE user_id IS NULL) as pending_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE role = 'user') as regular_users
FROM public.profiles;

-- Success message
SELECT 'Admin users display fix completed! The admin dashboard should now show all users.' as message;
