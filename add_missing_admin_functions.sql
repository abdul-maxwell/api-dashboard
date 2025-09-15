-- Add Missing Admin Functions
-- This will add all the missing admin functions that the dashboard needs

-- 1. Function to get all users for admin
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

  -- Get users with their API key counts
  SELECT json_agg(
    json_build_object(
      'user_id', p.user_id,
      'email', p.email,
      'username', p.username,
      'role', p.role,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'api_key_count', COALESCE(ak_count.count, 0),
      'active_api_keys', COALESCE(ak_count.active_count, 0)
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

-- 2. Function to get all API keys for admin
CREATE OR REPLACE FUNCTION public.admin_get_all_api_keys(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_user_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_keys_result JSON;
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
  FROM public.api_keys ak
  JOIN public.profiles p ON ak.user_id = p.user_id
  WHERE (p_user_id IS NULL OR ak.user_id = p_user_id)
    AND (p_status IS NULL OR 
         (p_status = 'active' AND ak.is_active = true) OR
         (p_status = 'inactive' AND ak.is_active = false) OR
         (p_status = 'trial' AND ak.is_trial = true) OR
         (p_status = 'paid' AND ak.is_trial = false));

  -- Get API keys with user info
  SELECT json_agg(
    json_build_object(
      'id', ak.id,
      'user_id', ak.user_id,
      'user_email', p.email,
      'user_username', p.username,
      'key_value', ak.key_value,
      'name', ak.name,
      'duration', ak.duration,
      'expires_at', ak.expires_at,
      'is_active', ak.is_active,
      'is_trial', ak.is_trial,
      'payment_status', ak.payment_status,
      'price_ksh', ak.price_ksh,
      'created_by_admin', ak.created_by_admin,
      'admin_notes', ak.admin_notes,
      'created_at', ak.created_at,
      'updated_at', ak.updated_at,
      'last_used_at', ak.last_used_at
    ) ORDER BY ak.created_at DESC
  ) INTO api_keys_result
  FROM (
    SELECT ak.*
    FROM public.api_keys ak
    JOIN public.profiles p ON ak.user_id = p.user_id
    WHERE (p_user_id IS NULL OR ak.user_id = p_user_id)
      AND (p_status IS NULL OR 
           (p_status = 'active' AND ak.is_active = true) OR
           (p_status = 'inactive' AND ak.is_active = false) OR
           (p_status = 'trial' AND ak.is_trial = true) OR
           (p_status = 'paid' AND ak.is_trial = false))
    ORDER BY ak.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) ak
  JOIN public.profiles p ON ak.user_id = p.user_id;

  RETURN json_build_object(
    'success', true,
    'api_keys', COALESCE(api_keys_result, '[]'::json),
    'total_count', total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- 3. Function to get all transactions for admin
CREATE OR REPLACE FUNCTION public.admin_get_all_transactions(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transactions_result JSON;
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
  FROM public.transactions t
  JOIN public.profiles p ON t.user_id = p.user_id
  WHERE (p_status IS NULL OR t.status = p_status)
    AND (p_type IS NULL OR t.type = p_type)
    AND (p_user_id IS NULL OR t.user_id = p_user_id);

  -- Get transactions with user info
  SELECT json_agg(
    json_build_object(
      'id', t.id,
      'transaction_id', t.transaction_id,
      'user_id', t.user_id,
      'user_email', p.email,
      'user_username', p.username,
      'type', t.type,
      'status', t.status,
      'amount', t.amount,
      'currency', t.currency,
      'description', t.description,
      'payment_method', t.payment_method,
      'payment_provider', t.payment_provider,
      'provider_transaction_id', t.provider_transaction_id,
      'error_message', t.error_message,
      'success_message', t.success_message,
      'metadata', t.metadata,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'processed_at', t.processed_at,
      'expires_at', t.expires_at
    ) ORDER BY t.created_at DESC
  ) INTO transactions_result
  FROM (
    SELECT t.*
    FROM public.transactions t
    JOIN public.profiles p ON t.user_id = p.user_id
    WHERE (p_status IS NULL OR t.status = p_status)
      AND (p_type IS NULL OR t.type = p_type)
      AND (p_user_id IS NULL OR t.user_id = p_user_id)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t
  JOIN public.profiles p ON t.user_id = p.user_id;

  RETURN json_build_object(
    'success', true,
    'transactions', COALESCE(transactions_result, '[]'::json),
    'total_count', total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- 4. Function to get transaction statistics for admin
CREATE OR REPLACE FUNCTION public.admin_get_transaction_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_amount DECIMAL(10,2);
  successful_count INTEGER;
  pending_count INTEGER;
  failed_count INTEGER;
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

  -- Get statistics
  SELECT 
    COALESCE(SUM(amount), 0) as total,
    COUNT(*) FILTER (WHERE status = 'success') as successful,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
  INTO total_amount, successful_count, pending_count, failed_count
  FROM public.transactions;

  RETURN json_build_object(
    'success', true,
    'total_amount', total_amount,
    'successful_count', successful_count,
    'pending_count', pending_count,
    'failed_count', failed_count
  );
END;
$$;

-- 5. Function to create user (admin only)
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

-- 6. Function to update user (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id UUID,
  p_email TEXT,
  p_username TEXT,
  p_role TEXT,
  p_new_password TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
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
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Target user not found'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('user', 'admin', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid role. Must be user, admin, or super_admin'
    );
  END IF;
  
  -- Update user profile
  UPDATE public.profiles 
  SET 
    email = p_email,
    username = p_username,
    role = p_role::user_role,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User updated successfully'
  );
END;
$$;

-- 7. Function to delete user (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
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
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Target user not found'
    );
  END IF;
  
  -- Delete user (this will cascade to related tables due to foreign keys)
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );
END;
$$;

-- 8. Function to manage API key (admin only)
CREATE OR REPLACE FUNCTION public.admin_manage_api_key(
  p_api_key_id UUID,
  p_action TEXT,
  p_pause_days INTEGER DEFAULT NULL,
  p_pause_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  update_data JSONB;
BEGIN
  -- Check if current user is admin
  admin_user_id := auth.uid();
  IF NOT public.is_admin(admin_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied. Admin privileges required.'
    );
  END IF;
  
  -- Check if API key exists
  IF NOT EXISTS (SELECT 1 FROM public.api_keys WHERE id = p_api_key_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'API key not found'
    );
  END IF;
  
  -- Prepare update data based on action
  CASE p_action
    WHEN 'deactivate' THEN
      update_data := json_build_object(
        'is_active', false,
        'updated_at', now()
      );
    WHEN 'activate' THEN
      update_data := json_build_object(
        'is_active', true,
        'updated_at', now()
      );
    WHEN 'pause' THEN
      IF p_pause_days IS NULL THEN
        RETURN json_build_object(
          'success', false,
          'message', 'Pause days required for pause action'
        );
      END IF;
      update_data := json_build_object(
        'is_active', false,
        'updated_at', now()
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'Invalid action. Must be activate, deactivate, or pause'
      );
  END CASE;
  
  -- Update API key
  UPDATE public.api_keys
  SET 
    is_active = (update_data->>'is_active')::boolean,
    updated_at = (update_data->>'updated_at')::timestamp
  WHERE id = p_api_key_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'API key updated successfully'
  );
END;
$$;

-- Success message
SELECT 'All missing admin functions have been created successfully!' as message;
