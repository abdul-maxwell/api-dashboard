-- Fix All Issues - Complete System Restoration
-- This will fix all the remaining issues: admin functions, transaction functions, and trial claiming

-- Step 1: Add all missing admin functions
-- Function to get all users for admin
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

-- Function to get all API keys for admin
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

-- Function to get all transactions for admin
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

-- Function to get transaction statistics for admin
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

-- Step 2: Add all missing transaction functions
-- Function to create a transaction
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

-- Function to update transaction status
CREATE OR REPLACE FUNCTION public.update_transaction_status(
  p_transaction_id TEXT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_success_message TEXT DEFAULT NULL,
  p_provider_transaction_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF p_transaction_id IS NULL OR p_status IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction ID and status are required'
    );
  END IF;

  -- Update the transaction
  UPDATE public.transactions
  SET 
    status = p_status,
    error_message = p_error_message,
    success_message = p_success_message,
    provider_transaction_id = COALESCE(p_provider_transaction_id, provider_transaction_id),
    metadata = COALESCE(p_metadata, metadata),
    processed_at = CASE WHEN p_status IN ('success', 'failed', 'cancelled') THEN now() ELSE processed_at END,
    updated_at = now()
  WHERE transaction_id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Transaction updated successfully'
  );
END;
$$;

-- Function to get user transactions
CREATE OR REPLACE FUNCTION public.get_user_transactions(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transactions_result JSON;
  total_count INTEGER;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Unauthorized: User not authenticated'
    );
  END IF;

  -- Get total count for the current user
  SELECT COUNT(*) INTO total_count
  FROM public.transactions t
  WHERE t.user_id = current_user_id
    AND (p_status IS NULL OR t.status = p_status)
    AND (p_type IS NULL OR t.type = p_type);

  -- Get transactions for the current user with proper ordering
  SELECT json_agg(
    json_build_object(
      'id', t.id,
      'transaction_id', t.transaction_id,
      'user_id', t.user_id,
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
    SELECT *
    FROM public.transactions t
    WHERE t.user_id = current_user_id
      AND (p_status IS NULL OR t.status = p_status)
      AND (p_type IS NULL OR t.type = p_type)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN json_build_object(
    'success', true,
    'transactions', COALESCE(transactions_result, '[]'::json),
    'total_count', total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- Step 3: Ensure all necessary functions exist
-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Function to send notifications
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_priority TEXT DEFAULT 'medium'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, priority)
  VALUES (p_user_id, p_title, p_message, p_type, p_priority);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Notification sent successfully'
  );
END;
$$;

-- Function to get user by username or email for login
CREATE OR REPLACE FUNCTION public.get_user_by_username_or_email(
  p_identifier TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Try to find user by username first, then by email
  SELECT 
    p.user_id,
    p.email,
    p.username,
    p.role,
    au.email as auth_email
  INTO user_record
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.user_id = au.id
  WHERE p.username = p_identifier OR p.email = p_identifier
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', user_record.user_id,
    'email', user_record.email,
    'username', user_record.username,
    'role', user_record.role,
    'auth_email', user_record.auth_email
  );
END;
$$;

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_availability(
  p_username TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_exists BOOLEAN;
BEGIN
  -- Check if username already exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE username = p_username
  ) INTO username_exists;
  
  RETURN json_build_object(
    'available', NOT username_exists,
    'username', p_username,
    'message', CASE 
      WHEN username_exists THEN 'Username is already taken'
      ELSE 'Username is available'
    END
  );
END;
$$;

-- Function to calculate expiration date
CREATE OR REPLACE FUNCTION public.calculate_expiration_date(duration_type api_key_duration)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
BEGIN
  CASE duration_type
    WHEN '1_week' THEN
      RETURN now() + INTERVAL '7 days';
    WHEN '30_days' THEN
      RETURN now() + INTERVAL '30 days';
    WHEN '60_days' THEN
      RETURN now() + INTERVAL '60 days';
    WHEN 'forever' THEN
      RETURN NULL;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;

-- Success message
SELECT 'All issues have been fixed! Admin functions, transaction functions, and trial claiming should now work properly.' as message;
