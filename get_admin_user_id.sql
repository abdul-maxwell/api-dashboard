-- Get Admin User ID
-- Run this first to get the actual user ID

-- 1. Check if admin user exists in auth.users
SELECT 
  id as user_id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'admin@zetechmd.com';

-- 2. If no user found, you need to create one manually in Supabase Dashboard
-- Go to: Authentication -> Users -> Add user
-- Email: admin@zetechmd.com
-- Password: Admin@BSE2025
