-- Fix Purchase API Issues
-- This will fix the purchase API loading issues and missing functions

-- Step 1: Ensure all transaction functions exist and work properly
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

-- Step 2: Fix update transaction function
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

-- Step 3: Fix get packages function to return proper format
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
  FROM public.packages p
  WHERE p.is_active = true;

  RETURN json_build_object(
    'success', true,
    'packages', COALESCE(packages_result, '[]'::json)
  );
END;
$$;

-- Step 4: Add function to get transaction by checkout ID
CREATE OR REPLACE FUNCTION public.get_transaction_by_checkout_id(
  p_checkout_request_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_record RECORD;
BEGIN
  SELECT * INTO transaction_record
  FROM public.transactions
  WHERE provider_transaction_id = p_checkout_request_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'transaction', json_build_object(
      'id', transaction_record.id,
      'transaction_id', transaction_record.transaction_id,
      'user_id', transaction_record.user_id,
      'type', transaction_record.type,
      'status', transaction_record.status,
      'amount', transaction_record.amount,
      'currency', transaction_record.currency,
      'description', transaction_record.description,
      'payment_method', transaction_record.payment_method,
      'payment_provider', transaction_record.payment_provider,
      'provider_transaction_id', transaction_record.provider_transaction_id,
      'error_message', transaction_record.error_message,
      'success_message', transaction_record.success_message,
      'metadata', transaction_record.metadata,
      'created_at', transaction_record.created_at,
      'updated_at', transaction_record.updated_at,
      'processed_at', transaction_record.processed_at,
      'expires_at', transaction_record.expires_at
    )
  );
END;
$$;

-- Step 5: Add function to cleanup expired transactions
CREATE OR REPLACE FUNCTION public.cleanup_expired_transactions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update expired pending transactions to failed
  UPDATE public.transactions
  SET 
    status = 'failed',
    error_message = 'Transaction expired',
    processed_at = now(),
    updated_at = now()
  WHERE status = 'pending' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Update associated API keys to failed
  UPDATE public.api_keys
  SET 
    payment_status = 'failed',
    is_active = false,
    updated_at = now()
  WHERE payment_status = 'pending'
    AND id IN (
      SELECT ak.id
      FROM public.api_keys ak
      JOIN public.payments p ON ak.payment_id = p.id
      JOIN public.transactions t ON p.mpesa_checkout_request_id = t.provider_transaction_id
      WHERE t.status = 'failed' AND t.error_message = 'Transaction expired'
    );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Expired transactions cleaned up successfully',
    'updated_count', updated_count
  );
END;
$$;

-- Step 6: Ensure all necessary functions exist
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

-- Step 7: Add function to send notifications
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

-- Step 8: Add function to get user by username or email
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

-- Step 9: Add function to check username availability
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

-- Step 10: Add function to calculate expiration date
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
SELECT 'Purchase API issues have been fixed! All transaction functions and package functions should now work properly.' as message;
