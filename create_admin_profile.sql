-- Create Admin Profile - Use the actual user ID from get_admin_user_id.sql
-- Replace 'REPLACE_WITH_ACTUAL_USER_ID' with the actual UUID from the previous query

-- Step 1: Get the admin user ID (run this first)
SELECT 
  id as admin_user_id,
  email,
  email_confirmed_at
FROM auth.users 
WHERE email = 'admin@zetechmd.com';

-- Step 2: Create the admin profile (replace the UUID below with the actual one from Step 1)
-- Example: If the user ID is '123e4567-e89b-12d3-a456-426614174000', use that instead of 'REPLACE_WITH_ACTUAL_USER_ID'

INSERT INTO public.profiles (user_id, email, username, role, created_at, updated_at)
VALUES (
  'REPLACE_WITH_ACTUAL_USER_ID',  -- Replace this with the actual UUID from Step 1
  'admin@zetechmd.com', 
  'admin', 
  'admin', 
  now(), 
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  username = 'admin',
  email = 'admin@zetechmd.com',
  updated_at = now();

-- Step 3: Verify the admin profile was created
SELECT 
  p.user_id,
  p.email,
  p.username,
  p.role,
  au.email_confirmed_at,
  public.is_admin(p.user_id) as is_admin_check
FROM public.profiles p
JOIN auth.users au ON p.user_id = au.id
WHERE p.email = 'admin@zetechmd.com';
