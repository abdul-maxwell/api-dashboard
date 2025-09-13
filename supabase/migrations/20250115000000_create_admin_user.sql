-- Create admin user
-- This migration creates an admin user that can be used to access the admin panel
-- Run this in the Supabase SQL editor

-- First, create the auth user (this needs to be done manually in Supabase Auth dashboard)
-- Email: admin@zetechmd.com
-- Password: Admin@BSE2025
-- Make sure to confirm the email

-- Then run this part to create the profile
-- Replace 'ADMIN_USER_ID_HERE' with the actual user ID from the auth.users table

-- Uncomment and run this after creating the auth user:
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
  username = 'admin';
*/

-- Alternative: If you want to create the user programmatically, you can use this function
-- (This requires service role key and should be run from a secure environment)

CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  result JSON;
BEGIN
  -- This function can only be called by a superuser or service role
  -- It creates an admin user if one doesn't exist
  
  -- Check if admin user already exists
  SELECT user_id INTO admin_user_id
  FROM public.profiles
  WHERE email = 'admin@zetechmd.com' AND role = 'admin';
  
  IF admin_user_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Admin user already exists',
      'user_id', admin_user_id
    );
  END IF;
  
  -- Note: This function cannot create auth users directly
  -- The auth user must be created through Supabase Auth API or dashboard
  RETURN json_build_object(
    'success', false,
    'message', 'Please create the auth user manually first, then run the profile creation part'
  );
END;
$$;
