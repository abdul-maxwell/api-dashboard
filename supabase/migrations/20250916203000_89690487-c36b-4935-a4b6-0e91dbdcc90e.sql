-- Create missing database functions that the frontend is trying to call

-- Function to calculate expiration date
CREATE OR REPLACE FUNCTION public.calculate_expiration_date(p_duration text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_duration
    WHEN '1_week' THEN RETURN now() + INTERVAL '7 days';
    WHEN '2_weeks' THEN RETURN now() + INTERVAL '14 days';
    WHEN '1_month' THEN RETURN now() + INTERVAL '30 days';
    WHEN '3_months' THEN RETURN now() + INTERVAL '90 days';
    WHEN '6_months' THEN RETURN now() + INTERVAL '180 days';
    WHEN '1_year' THEN RETURN now() + INTERVAL '365 days';
    WHEN 'forever' THEN RETURN NULL;
    ELSE RETURN now() + INTERVAL '30 days'; -- Default to 1 month
  END CASE;
END;
$$;

-- Function to create API key (admin)
CREATE OR REPLACE FUNCTION public.admin_create_api_key(
  p_user_id uuid,
  p_name text,
  p_duration text,
  p_price_ksh numeric DEFAULT 0,
  p_admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  new_api_key_id UUID;
  api_key_value TEXT;
  expiration_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if current user is admin
  admin_user_id := auth.uid();
  IF NOT public.is_admin(admin_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied. Admin privileges required.'
    );
  END IF;
  
  -- Generate API key value
  api_key_value := 'ak_admin_' || encode(gen_random_bytes(32), 'hex');
  
  -- Calculate expiration date
  SELECT public.calculate_expiration_date(p_duration) INTO expiration_date;
  
  -- Create API key
  INSERT INTO public.api_keys (
    user_id,
    key_value,
    name,
    expires_at,
    is_active,
    is_trial,
    price_ksh,
    created_by_admin,
    admin_notes
  ) VALUES (
    p_user_id,
    api_key_value,
    p_name,
    expiration_date,
    true,
    false,
    p_price_ksh,
    true,
    p_admin_notes
  ) RETURNING id INTO new_api_key_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'API key created successfully',
    'api_key_id', new_api_key_id,
    'api_key_value', api_key_value
  );
END;
$$;

-- Function to manage API key (admin)
CREATE OR REPLACE FUNCTION public.admin_manage_api_key(
  p_api_key_id uuid,
  p_action text,
  p_admin_notes text DEFAULT NULL
)
RETURNS json
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
  
  CASE p_action
    WHEN 'activate' THEN
      UPDATE public.api_keys 
      SET is_active = true, admin_notes = COALESCE(p_admin_notes, admin_notes)
      WHERE id = p_api_key_id;
      
    WHEN 'deactivate' THEN
      UPDATE public.api_keys 
      SET is_active = false, admin_notes = COALESCE(p_admin_notes, admin_notes)
      WHERE id = p_api_key_id;
      
    WHEN 'delete' THEN
      DELETE FROM public.api_keys WHERE id = p_api_key_id;
      
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'Invalid action. Use activate, deactivate, or delete.'
      );
  END CASE;
  
  RETURN json_build_object(
    'success', true,
    'message', 'API key ' || p_action || ' successful'
  );
END;
$$;

-- Function to create transaction
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id uuid,
  p_transaction_id text,
  p_amount numeric,
  p_currency text DEFAULT 'KES',
  p_description text DEFAULT NULL,
  p_payment_method text DEFAULT 'mpesa',
  p_checkout_request_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id UUID;
BEGIN
  INSERT INTO public.transactions (
    user_id,
    transaction_id,
    amount,
    currency,
    description,
    payment_method,
    checkout_request_id,
    status,
    expires_at
  ) VALUES (
    p_user_id,
    p_transaction_id,
    p_amount,
    p_currency,
    p_description,
    p_payment_method,
    p_checkout_request_id,
    'pending',
    now() + INTERVAL '1 hour'
  ) RETURNING id INTO new_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', new_transaction_id,
    'message', 'Transaction created successfully'
  );
END;
$$;

-- Function to update transaction status
CREATE OR REPLACE FUNCTION public.update_transaction_status(
  p_transaction_id text,
  p_status text,
  p_mpesa_receipt_number text DEFAULT NULL,
  p_success_message text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.transactions 
  SET 
    status = p_status,
    mpesa_receipt_number = COALESCE(p_mpesa_receipt_number, mpesa_receipt_number),
    success_message = COALESCE(p_success_message, success_message),
    error_message = COALESCE(p_error_message, error_message),
    processed_at = CASE WHEN p_status IN ('completed', 'failed') THEN now() ELSE processed_at END,
    updated_at = now()
  WHERE transaction_id = p_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction status updated successfully'
  );
END;
$$;