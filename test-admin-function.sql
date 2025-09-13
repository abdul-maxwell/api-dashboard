-- Test if the admin function works
-- First, let's check if the profiles table has the required columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check if user_role enum exists
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');

-- Test the admin function (this will fail if user is not admin, which is expected)
SELECT * FROM public.admin_get_all_users();