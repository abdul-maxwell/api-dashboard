-- Create Admin User - Final Setup
-- Run this AFTER running fix_database_setup.sql

-- First, you need to create the auth user manually in Supabase Auth dashboard:
-- Email: admin@zetechmd.com
-- Password: Admin@BSE2025
-- Make sure to confirm the email

-- Then run this to create the admin profile:
-- Replace 'YOUR_ADMIN_USER_ID_HERE' with the actual user ID from auth.users table

-- To get the admin user ID, run this query first:
-- SELECT id, email FROM auth.users WHERE email = 'admin@zetechmd.com';

-- Then replace 'YOUR_ADMIN_USER_ID_HERE' below with the actual ID and run:

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

-- Verify the admin user was created:
SELECT 
  p.user_id,
  p.email,
  p.username,
  p.role,
  au.email as auth_email
FROM public.profiles p
JOIN auth.users au ON p.user_id = au.id
WHERE p.email = 'admin@zetechmd.com';

-- Success message
SELECT 'Admin user created successfully! You can now login with admin@zetechmd.com' as message;
