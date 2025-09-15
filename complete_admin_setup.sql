-- Complete Admin Setup - This will work automatically
-- Run this entire script - it will find the user ID and create the profile

-- Step 1: Check if admin user exists
DO $$
DECLARE
    admin_user_id UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@zetechmd.com';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found. Please create the user first:';
        RAISE NOTICE '1. Go to Supabase Dashboard -> Authentication -> Users';
        RAISE NOTICE '2. Click "Add user"';
        RAISE NOTICE '3. Email: admin@zetechmd.com';
        RAISE NOTICE '4. Password: Admin@BSE2025';
        RAISE NOTICE '5. Confirm the email';
        RAISE NOTICE '6. Then run this script again';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found admin user with ID: %', admin_user_id;
    
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

-- Step 2: Verify the setup
SELECT 
    'Admin Setup Complete' as status,
    p.user_id,
    p.email,
    p.username,
    p.role,
    au.email_confirmed_at,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'Email Confirmed ✅'
        ELSE 'Email NOT Confirmed ❌ - Please confirm in Supabase Dashboard'
    END as email_status,
    public.is_admin(p.user_id) as is_admin_check
FROM public.profiles p
JOIN auth.users au ON p.user_id = au.id
WHERE p.email = 'admin@zetechmd.com';

-- Step 3: Test admin function
SELECT 
    'Admin Function Test' as test,
    CASE 
        WHEN public.is_admin((SELECT user_id FROM public.profiles WHERE email = 'admin@zetechmd.com')) 
        THEN 'Admin privileges working ✅' 
        ELSE 'Admin privileges NOT working ❌' 
    END as result;
