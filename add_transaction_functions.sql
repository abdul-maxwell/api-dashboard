-- Add Missing Transaction Functions
-- This will add all the missing transaction-related functions

-- 1. Function to create a transaction
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

-- 2. Function to update transaction status
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

-- 3. Function to get transaction by checkout ID
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

-- 4. Function to cleanup expired transactions
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

-- 5. Function to get user transactions
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

-- Success message
SELECT 'All transaction functions have been created successfully!' as message;
