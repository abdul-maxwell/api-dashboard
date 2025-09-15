-- Apply new transaction functions
-- Run this directly in your Supabase SQL editor

-- Function to get user's own transactions (fixed version)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_transactions TO authenticated;

-- Function to clean up expired pending transactions
CREATE OR REPLACE FUNCTION public.cleanup_expired_transactions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
  updated_transactions JSON;
BEGIN
  -- Update expired pending transactions to failed status
  UPDATE public.transactions 
  SET 
    status = 'failed',
    error_message = 'Transaction expired - no response from payment provider',
    updated_at = NOW(),
    processed_at = NOW()
  WHERE status = 'pending' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW()
  RETURNING json_agg(
    json_build_object(
      'id', id,
      'transaction_id', transaction_id,
      'user_id', user_id,
      'amount', amount,
      'currency', currency
    )
  ) INTO updated_transactions;

  -- Get count of updated transactions
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Update related API keys to failed status
  UPDATE public.api_keys 
  SET 
    payment_status = 'failed',
    is_active = false
  WHERE payment_id IN (
    SELECT p.id 
    FROM public.payments p
    JOIN public.transactions t ON t.provider_transaction_id = p.mpesa_checkout_request_id
    WHERE t.status = 'failed' 
      AND t.error_message = 'Transaction expired - no response from payment provider'
      AND t.updated_at > NOW() - INTERVAL '1 minute'
  );

  RETURN json_build_object(
    'success', true,
    'expired_count', expired_count,
    'updated_transactions', COALESCE(updated_transactions, '[]'::json),
    'message', 'Expired transactions cleaned up successfully'
  );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_expired_transactions TO service_role;

-- Create a function to get transaction status for a specific checkout request
CREATE OR REPLACE FUNCTION public.get_transaction_by_checkout_id(
  p_checkout_request_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_result JSON;
BEGIN
  -- Get transaction by checkout request ID
  SELECT json_build_object(
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
  ) INTO transaction_result
  FROM public.transactions t
  WHERE t.provider_transaction_id = p_checkout_request_id;

  IF transaction_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction', transaction_result
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_transaction_by_checkout_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transaction_by_checkout_id TO service_role;
