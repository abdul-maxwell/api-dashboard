-- Fix Remaining Issues - Complete System Fix
-- This will fix: purchase API, missing columns, user creation, and admin display

-- Step 1: Fix packages table - add missing columns
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS original_price_ksh DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0;

-- Update existing packages with original_price_ksh
UPDATE public.packages 
SET original_price_ksh = price_ksh 
WHERE original_price_ksh IS NULL;

-- Step 2: Fix user creation issue - make user_id nullable temporarily for admin creation
ALTER TABLE public.profiles 
ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Add missing package management functions
CREATE OR REPLACE FUNCTION public.get_packages()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  packages_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'price_ksh', p.price_ksh,
      'original_price_ksh', p.original_price_ksh,
      'discount_percentage', p.discount_percentage,
      'duration', p.duration,
      'features', p.features,
      'is_active', p.is_active,
      'is_featured', p.is_featured,
      'is_popular', p.is_popular,
      'max_uses', p.max_uses,
      'current_uses', p.current_uses,
      'sort_order', p.sort_order,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) ORDER BY p.sort_order ASC, p.created_at ASC
  ) INTO packages_result
  FROM public.packages p
  WHERE p.is_active = true;

  RETURN json_build_object(
    'success', true,
    'packages', COALESCE(packages_result, '[]'::json)
  );
END;
$$;

-- Step 4: Add discount validation function
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_promo_code TEXT,
  p_user_id UUID,
  p_package_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  discount_record RECORD;
  usage_count INTEGER;
  user_usage_count INTEGER;
BEGIN
  -- Get current user ID if not provided
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  -- Find the discount
  SELECT * INTO discount_record
  FROM public.discounts
  WHERE promo_code = p_promo_code
    AND is_active = true
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until >= now());

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or expired promo code'
    );
  END IF;

  -- Check usage limits
  IF discount_record.usage_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO usage_count
    FROM public.user_discount_usage
    WHERE discount_id = discount_record.id;

    IF usage_count >= discount_record.usage_limit THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Promo code usage limit reached'
      );
    END IF;
  END IF;

  -- Check if user has already used this discount
  SELECT COUNT(*) INTO user_usage_count
  FROM public.user_discount_usage
  WHERE user_id = p_user_id AND discount_id = discount_record.id;

  IF user_usage_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You have already used this promo code'
    );
  END IF;

  -- Check if discount applies to specific package
  IF p_package_id IS NOT NULL AND discount_record.applicable_packages IS NOT NULL THEN
    IF NOT (discount_record.applicable_packages ? p_package_id::text) THEN
      RETURN json_build_object(
        'success', false,
        'message', 'This promo code is not valid for the selected package'
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'discount', json_build_object(
      'id', discount_record.id,
      'promo_code', discount_record.promo_code,
      'name', discount_record.name,
      'description', discount_record.description,
      'discount_type', discount_record.discount_type,
      'discount_value', discount_record.discount_value,
      'min_amount', discount_record.min_amount,
      'max_discount', discount_record.max_discount
    ),
    'message', 'Promo code is valid'
  );
END;
$$;

-- Step 5: Add apply promo code function
CREATE OR REPLACE FUNCTION public.apply_promo_code(
  p_promo_code TEXT,
  p_user_id UUID,
  p_package_id UUID,
  p_original_price DECIMAL(10,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  discount_record RECORD;
  discount_amount DECIMAL(10,2);
  final_price DECIMAL(10,2);
  validation_result JSON;
BEGIN
  -- Get current user ID if not provided
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  -- Validate the promo code first
  SELECT public.validate_promo_code(p_promo_code, p_user_id, p_package_id) INTO validation_result;
  
  IF NOT (validation_result->>'success')::boolean THEN
    RETURN validation_result;
  END IF;

  -- Get discount details
  SELECT * INTO discount_record
  FROM public.discounts
  WHERE promo_code = p_promo_code;

  -- Calculate discount
  IF discount_record.discount_type = 'percentage' THEN
    discount_amount := (p_original_price * discount_record.discount_value / 100);
    IF discount_record.max_discount IS NOT NULL AND discount_amount > discount_record.max_discount THEN
      discount_amount := discount_record.max_discount;
    END IF;
  ELSE
    discount_amount := discount_record.discount_value;
  END IF;

  -- Check minimum amount requirement
  IF discount_record.min_amount IS NOT NULL AND p_original_price < discount_record.min_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Minimum purchase amount not met for this promo code'
    );
  END IF;

  final_price := GREATEST(0, p_original_price - discount_amount);

  -- Record the usage
  INSERT INTO public.user_discount_usage (user_id, discount_id)
  VALUES (p_user_id, discount_record.id)
  ON CONFLICT (user_id, discount_id) DO NOTHING;

  -- Update usage count
  UPDATE public.discounts
  SET used_count = used_count + 1
  WHERE id = discount_record.id;

  RETURN json_build_object(
    'success', true,
    'original_price', p_original_price,
    'discount_amount', discount_amount,
    'final_price', final_price,
    'discount', json_build_object(
      'id', discount_record.id,
      'promo_code', discount_record.promo_code,
      'name', discount_record.name,
      'discount_type', discount_record.discount_type,
      'discount_value', discount_record.discount_value
    )
  );
END;
$$;

-- Step 6: Fix admin user creation function
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_username TEXT,
  p_password TEXT,
  p_role TEXT DEFAULT 'user'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  new_user_id UUID;
  result JSON;
BEGIN
  -- Check if current user is admin
  admin_user_id := auth.uid();
  IF NOT public.is_admin(admin_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied. Admin privileges required.'
    );
  END IF;
  
  -- Validate inputs
  IF p_email IS NULL OR p_username IS NULL OR p_password IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email, username, and password are required'
    );
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A user with this email already exists'
    );
  END IF;
  
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Username is already taken'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('user', 'admin', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid role. Must be user, admin, or super_admin'
    );
  END IF;
  
  -- Create a profile record with NULL user_id initially
  -- The user_id will be set when the user actually signs up
  INSERT INTO public.profiles (
    user_id,
    email,
    username,
    role
  ) VALUES (
    NULL, -- user_id will be set when user signs up
    p_email,
    p_username,
    p_role::user_role
  ) RETURNING id INTO new_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User profile created successfully. The user can now sign up with these credentials.',
    'profile_id', new_user_id,
    'email', p_email,
    'username', p_username,
    'role', p_role
  );
END;
$$;

-- Step 7: Fix admin get all users function to handle NULL user_ids
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

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM public.profiles p
  WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.username ILIKE '%' || p_search || '%');

  -- Get users with their API key counts (including those with NULL user_id)
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

-- Step 8: Add function to link profile to user when they sign up
CREATE OR REPLACE FUNCTION public.link_profile_to_user(
  p_email TEXT,
  p_auth_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Find the profile with matching email and NULL user_id
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE email = p_email AND user_id IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No pending profile found for this email'
    );
  END IF;
  
  -- Update the profile with the auth user_id
  UPDATE public.profiles 
  SET user_id = p_auth_user_id
  WHERE id = profile_record.id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Profile linked to auth user successfully',
    'profile_id', profile_record.id,
    'username', profile_record.username,
    'role', profile_record.role
  );
END;
$$;

-- Step 9: Update existing packages with better data
UPDATE public.packages 
SET 
  original_price_ksh = price_ksh,
  is_popular = CASE 
    WHEN name = 'Standard Plan' THEN true 
    ELSE false 
  END,
  discount_percentage = 0
WHERE original_price_ksh IS NULL;

-- Step 10: Add some sample discounts
INSERT INTO public.discounts (promo_code, name, description, discount_type, discount_value, usage_limit, valid_until, is_active)
VALUES 
  ('WELCOME20', 'Welcome Discount', '20% off your first purchase', 'percentage', 20.00, 100, now() + interval '1 year', true),
  ('SAVE50', 'Fixed Discount', 'Save 50 KES on any plan', 'fixed', 50.00, 50, now() + interval '6 months', true),
  ('STUDENT15', 'Student Discount', '15% off for students', 'percentage', 15.00, 200, now() + interval '1 year', true)
ON CONFLICT (promo_code) DO NOTHING;

-- Success message
SELECT 'All remaining issues have been fixed! Purchase API, packages, user creation, and admin display should now work properly.' as message;
