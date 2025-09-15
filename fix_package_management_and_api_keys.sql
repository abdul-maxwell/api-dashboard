-- Fix Package Management and API Key Creation Issues
-- This will fix package management, admin API key creation, and transaction issues

-- Step 1: Fix RLS policies for api_keys table to allow admin access
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;

-- Create new policies that allow admin access
CREATE POLICY "Users can view their own API keys" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own API keys" 
ON public.api_keys 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own API keys" 
ON public.api_keys 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_admin());

-- Step 2: Add package management functions
CREATE OR REPLACE FUNCTION public.admin_create_package(
  p_name TEXT,
  p_description TEXT,
  p_price_ksh DECIMAL(10,2),
  p_original_price_ksh DECIMAL(10,2),
  p_duration api_key_duration,
  p_features JSONB DEFAULT '[]'::jsonb,
  p_is_featured BOOLEAN DEFAULT false,
  p_is_popular BOOLEAN DEFAULT false,
  p_sort_order INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  new_package_id UUID;
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
  IF p_name IS NULL OR p_price_ksh IS NULL OR p_duration IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Name, price, and duration are required'
    );
  END IF;

  -- Create the package
  INSERT INTO public.packages (
    name,
    description,
    price_ksh,
    original_price_ksh,
    duration,
    features,
    is_featured,
    is_popular,
    sort_order
  ) VALUES (
    p_name,
    p_description,
    COALESCE(p_original_price_ksh, p_price_ksh),
    p_price_ksh,
    p_duration,
    p_features,
    p_is_featured,
    p_is_popular,
    p_sort_order
  ) RETURNING id INTO new_package_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Package created successfully',
    'package_id', new_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_package(
  p_package_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_price_ksh DECIMAL(10,2),
  p_original_price_ksh DECIMAL(10,2),
  p_duration api_key_duration,
  p_features JSONB DEFAULT '[]'::jsonb,
  p_is_featured BOOLEAN DEFAULT false,
  p_is_popular BOOLEAN DEFAULT false,
  p_sort_order INTEGER DEFAULT 0,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Validate inputs
  IF p_package_id IS NULL OR p_name IS NULL OR p_price_ksh IS NULL OR p_duration IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Package ID, name, price, and duration are required'
    );
  END IF;

  -- Update the package
  UPDATE public.packages
  SET 
    name = p_name,
    description = p_description,
    price_ksh = p_price_ksh,
    original_price_ksh = COALESCE(p_original_price_ksh, p_price_ksh),
    duration = p_duration,
    features = p_features,
    is_featured = p_is_featured,
    is_popular = p_is_popular,
    sort_order = p_sort_order,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_package_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Package not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Package updated successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_package(p_package_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Delete the package
  DELETE FROM public.packages WHERE id = p_package_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Package not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Package deleted successfully'
  );
END;
$$;

-- Step 3: Add discount management functions
CREATE OR REPLACE FUNCTION public.admin_create_discount(
  p_promo_code TEXT,
  p_name TEXT,
  p_description TEXT,
  p_discount_type TEXT,
  p_discount_value DECIMAL(10,2),
  p_min_amount DECIMAL(10,2) DEFAULT 0,
  p_max_discount DECIMAL(10,2) DEFAULT NULL,
  p_usage_limit INTEGER DEFAULT NULL,
  p_valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_applicable_packages JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  new_discount_id UUID;
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
  IF p_promo_code IS NULL OR p_name IS NULL OR p_discount_type IS NULL OR p_discount_value IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Promo code, name, discount type, and discount value are required'
    );
  END IF;

  -- Validate discount type
  IF p_discount_type NOT IN ('percentage', 'fixed') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Discount type must be percentage or fixed'
    );
  END IF;

  -- Create the discount
  INSERT INTO public.discounts (
    promo_code,
    name,
    description,
    discount_type,
    discount_value,
    min_amount,
    max_discount,
    usage_limit,
    valid_until,
    applicable_packages
  ) VALUES (
    p_promo_code,
    p_name,
    p_description,
    p_discount_type,
    p_discount_value,
    p_min_amount,
    p_max_discount,
    p_usage_limit,
    p_valid_until,
    p_applicable_packages
  ) RETURNING id INTO new_discount_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Discount created successfully',
    'discount_id', new_discount_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_discount(
  p_discount_id UUID,
  p_promo_code TEXT,
  p_name TEXT,
  p_description TEXT,
  p_discount_type TEXT,
  p_discount_value DECIMAL(10,2),
  p_min_amount DECIMAL(10,2) DEFAULT 0,
  p_max_discount DECIMAL(10,2) DEFAULT NULL,
  p_usage_limit INTEGER DEFAULT NULL,
  p_valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_applicable_packages JSONB DEFAULT '[]'::jsonb,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Validate inputs
  IF p_discount_id IS NULL OR p_promo_code IS NULL OR p_name IS NULL OR p_discount_type IS NULL OR p_discount_value IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Discount ID, promo code, name, discount type, and discount value are required'
    );
  END IF;

  -- Validate discount type
  IF p_discount_type NOT IN ('percentage', 'fixed') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Discount type must be percentage or fixed'
    );
  END IF;

  -- Update the discount
  UPDATE public.discounts
  SET 
    promo_code = p_promo_code,
    name = p_name,
    description = p_description,
    discount_type = p_discount_type,
    discount_value = p_discount_value,
    min_amount = p_min_amount,
    max_discount = p_max_discount,
    usage_limit = p_usage_limit,
    valid_until = p_valid_until,
    applicable_packages = p_applicable_packages,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_discount_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Discount not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Discount updated successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_discount(p_discount_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Delete the discount
  DELETE FROM public.discounts WHERE id = p_discount_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Discount not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Discount deleted successfully'
  );
END;
$$;

-- Step 4: Fix admin API key creation function
CREATE OR REPLACE FUNCTION public.admin_create_api_key(
  p_target_user_id UUID,
  p_name TEXT,
  p_duration api_key_duration,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  new_api_key_id UUID;
  key_value TEXT;
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
  IF p_target_user_id IS NULL OR p_name IS NULL OR p_duration IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Target user ID, name, and duration are required'
    );
  END IF;

  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Target user not found'
    );
  END IF;

  -- Generate API key
  key_value := 'ak_' + Array.from({ length: 32 }, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      .charAt(Math.floor(Math.random() * 62))
  ).join('');

  -- Deactivate existing active API keys for the user
  UPDATE public.api_keys
  SET is_active = false
  WHERE user_id = p_target_user_id AND is_active = true;

  -- Create the new API key
  INSERT INTO public.api_keys (
    user_id,
    name,
    key_value,
    duration,
    expires_at,
    is_active,
    is_trial,
    payment_status,
    created_by_admin,
    admin_notes
  ) VALUES (
    p_target_user_id,
    p_name,
    key_value,
    p_duration,
    p_expires_at,
    true,
    false,
    'completed',
    true,
    p_admin_notes
  ) RETURNING id INTO new_api_key_id;

  RETURN json_build_object(
    'success', true,
    'message', 'API key created successfully',
    'api_key_id', new_api_key_id,
    'key_value', key_value
  );
END;
$$;

-- Step 5: Fix transaction functions to ensure they work properly
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id UUID,
  p_transaction_id TEXT,
  p_type TEXT,
  p_status TEXT,
  p_amount DECIMAL(10,2) DEFAULT NULL,
  p_currency TEXT DEFAULT 'KES',
  p_description TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_payment_provider TEXT DEFAULT NULL,
  p_provider_transaction_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_success_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id UUID;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_transaction_id IS NULL OR p_type IS NULL OR p_status IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User ID, transaction ID, type, and status are required'
    );
  END IF;

  -- Check if transaction ID already exists
  IF EXISTS (SELECT 1 FROM public.transactions WHERE transaction_id = p_transaction_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction ID already exists'
    );
  END IF;

  -- Create the transaction
  INSERT INTO public.transactions (
    transaction_id,
    user_id,
    type,
    status,
    amount,
    currency,
    description,
    payment_method,
    payment_provider,
    provider_transaction_id,
    error_message,
    success_message,
    metadata,
    expires_at
  ) VALUES (
    p_transaction_id,
    p_user_id,
    p_type,
    p_status,
    p_amount,
    p_currency,
    p_description,
    p_payment_method,
    p_payment_provider,
    p_provider_transaction_id,
    p_error_message,
    p_success_message,
    p_metadata,
    p_expires_at
  ) RETURNING id INTO new_transaction_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Transaction created successfully',
    'transaction_id', new_transaction_id
  );
END;
$$;

-- Step 6: Add function to get packages for admin
CREATE OR REPLACE FUNCTION public.admin_get_packages()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  packages_result JSON;
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

  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'price_ksh', p.price_ksh,
      'original_price_ksh', COALESCE(p.original_price_ksh, p.price_ksh),
      'discount_percentage', COALESCE(p.discount_percentage, 0),
      'duration', p.duration,
      'features', COALESCE(p.features, '[]'::jsonb),
      'is_active', p.is_active,
      'is_featured', p.is_featured,
      'is_popular', COALESCE(p.is_popular, false),
      'max_uses', p.max_uses,
      'current_uses', COALESCE(p.current_uses, 0),
      'sort_order', p.sort_order,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) ORDER BY p.sort_order ASC, p.created_at ASC
  ) INTO packages_result
  FROM public.packages p;

  RETURN json_build_object(
    'success', true,
    'packages', COALESCE(packages_result, '[]'::json)
  );
END;
$$;

-- Step 7: Add function to get discounts for admin
CREATE OR REPLACE FUNCTION public.admin_get_discounts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  discounts_result JSON;
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

  SELECT json_agg(
    json_build_object(
      'id', d.id,
      'promo_code', d.promo_code,
      'name', d.name,
      'description', d.description,
      'discount_type', d.discount_type,
      'discount_value', d.discount_value,
      'min_amount', d.min_amount,
      'max_discount', d.max_discount,
      'usage_limit', d.usage_limit,
      'used_count', d.used_count,
      'valid_from', d.valid_from,
      'valid_until', d.valid_until,
      'is_active', d.is_active,
      'applicable_packages', COALESCE(d.applicable_packages, '[]'::jsonb),
      'created_at', d.created_at,
      'updated_at', d.updated_at
    ) ORDER BY d.created_at DESC
  ) INTO discounts_result
  FROM public.discounts d;

  RETURN json_build_object(
    'success', true,
    'discounts', COALESCE(discounts_result, '[]'::json)
  );
END;
$$;

-- Success message
SELECT 'Package management, API key creation, and transaction functions have been fixed!' as message;
