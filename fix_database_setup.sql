-- Fix Database Setup - Complete Database Initialization
-- This script creates all necessary tables and functions in the correct order

-- 1. Create user_role enum first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin');
    END IF;
END $$;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create api_key_duration enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_duration') THEN
        CREATE TYPE public.api_key_duration AS ENUM ('1_week', '30_days', '60_days', 'forever');
    END IF;
END $$;

-- 5. Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  duration api_key_duration NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_trial BOOLEAN DEFAULT false,
  payment_status TEXT DEFAULT 'completed',
  payment_id TEXT,
  price_ksh DECIMAL(10,2) DEFAULT 0,
  created_by_admin BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- 6. Enable RLS on api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 7. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'payment',
  status TEXT NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  description TEXT,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  payment_provider TEXT NOT NULL DEFAULT 'safaricom',
  provider_transaction_id TEXT,
  error_message TEXT,
  success_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 8. Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 9. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  amount_ksh DECIMAL(10,2) NOT NULL,
  duration api_key_duration NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  mpesa_checkout_request_id TEXT,
  mpesa_receipt_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 11. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  priority TEXT NOT NULL DEFAULT 'medium',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 14. Create RLS policies for api_keys
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
CREATE POLICY "Users can create their own API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
CREATE POLICY "Users can update their own API keys" 
ON public.api_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys" 
ON public.api_keys 
FOR DELETE 
USING (auth.uid() = user_id);

-- 15. Create RLS policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 16. Create RLS policies for payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update their own payments" 
ON public.payments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 17. Create RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 18. Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 19. Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 20. Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- 21. Trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 22. Function to calculate expiration date based on duration
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

-- 23. Function to check if user is admin
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

-- 24. Function to check username availability
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

-- 25. Function to get user by username or email for login
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

-- 26. Function to send notifications
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

-- 27. Function to get user transactions
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

-- 28. Function to update transaction status
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
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction status updated successfully'
  );
END;
$$;

-- 29. Function to get transaction by checkout ID
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

-- 30. Function to cleanup expired transactions
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

-- 31. Function to ensure Google user profile
CREATE OR REPLACE FUNCTION public.ensure_google_user_profile(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  profile_exists BOOLEAN;
BEGIN
  -- Check if a profile already exists for this user_id
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) INTO profile_exists;

  IF profile_exists THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Profile already exists for this user'
    );
  END IF;

  -- Get user details from auth.users
  SELECT * INTO user_record FROM auth.users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Auth user not found'
    );
  END IF;

  -- Create profile (without username - user will set it in username setup)
  INSERT INTO public.profiles (
    user_id,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    user_record.email,
    'user'::user_role,
    NOW(),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully - username setup required'
  );
END;
$$;

-- Success message
SELECT 'Database setup completed successfully! All tables, functions, and policies have been created.' as message;
