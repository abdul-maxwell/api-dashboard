-- Fix Admin User - Complete Setup
-- Run this to properly create and fix the admin user

-- Step 1: Ensure the profiles table exists (run fix_database_setup.sql first if this fails)
-- This is just a safety check
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'Profiles table does not exist. Please run fix_database_setup.sql first.';
    END IF;
END $$;

-- Step 2: Create the auth user if it doesn't exist
-- Note: This will only work if you have the right permissions
-- If this fails, create the user manually in Supabase Dashboard -> Authentication -> Users

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if admin user already exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@zetechmd.com';
    
    IF admin_user_id IS NULL THEN
        -- Try to create the user (this might fail due to permissions)
        BEGIN
            INSERT INTO auth.users (
                id,
                email,
                encrypted_password,
                email_confirmed_at,
                created_at,
                updated_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                role
            ) VALUES (
                gen_random_uuid(),
                'admin@zetechmd.com',
                crypt('Admin@BSE2025', gen_salt('bf')),
                now(),
                now(),
                now(),
                '{"provider": "email", "providers": ["email"]}',
                '{}',
                false,
                'authenticated'
            ) RETURNING id INTO admin_user_id;
            
            RAISE NOTICE 'Admin user created with ID: %', admin_user_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create auth user automatically. Please create manually in Supabase Dashboard.';
            RAISE NOTICE 'Email: admin@zetechmd.com';
            RAISE NOTICE 'Password: Admin@BSE2025';
        END;
    ELSE
        RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
    END IF;
END $$;

-- Step 3: Get the admin user ID and create/update the profile
DO $$
DECLARE
    admin_user_id UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@zetechmd.com';
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin user not found. Please create the user manually first.';
    END IF;
    
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = admin_user_id) INTO profile_exists;
    
    IF profile_exists THEN
        -- Update existing profile to ensure it has admin role
        UPDATE public.profiles 
        SET 
            role = 'admin',
            username = 'admin',
            email = 'admin@zetechmd.com',
            updated_at = now()
        WHERE user_id = admin_user_id;
        
        RAISE NOTICE 'Admin profile updated successfully';
    ELSE
        -- Create new profile
        INSERT INTO public.profiles (
            user_id,
            email,
            username,
            role,
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            'admin@zetechmd.com',
            'admin',
            'admin',
            now(),
            now()
        );
        
        RAISE NOTICE 'Admin profile created successfully';
    END IF;
END $$;

-- Step 4: Verify the admin user setup
SELECT 
    'Admin User Setup Complete' as status,
    p.user_id,
    p.email,
    p.username,
    p.role,
    au.email_confirmed_at,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'Email Confirmed'
        ELSE 'Email NOT Confirmed - Please confirm in Supabase Dashboard'
    END as email_status
FROM public.profiles p
JOIN auth.users au ON p.user_id = au.id
WHERE p.email = 'admin@zetechmd.com';

-- Step 5: Test the is_admin function
SELECT 
    'Admin Function Test' as test,
    public.is_admin((SELECT user_id FROM public.profiles WHERE email = 'admin@zetechmd.com')) as is_admin_result;
