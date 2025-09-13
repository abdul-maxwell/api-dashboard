-- Check existing users in profiles table
SELECT user_id, email, username, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- Check if there's already an admin user
SELECT user_id, email, username, role 
FROM public.profiles 
WHERE role IN ('admin', 'super_admin');

-- Check if username 'admin' exists
SELECT user_id, email, username, role 
FROM public.profiles 
WHERE username = 'admin';
