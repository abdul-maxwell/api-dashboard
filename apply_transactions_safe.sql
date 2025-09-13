-- Safe application of transactions table with existence checks
-- Run this directly in your Supabase SQL editor

-- Create transactions table for tracking all payment operations (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE NOT NULL, -- External transaction ID (e.g., from payment provider)
  type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'subscription', 'trial', 'api_usage')),
  status TEXT NOT NULL CHECK (status IN ('attempted', 'pending', 'processing', 'success', 'failed', 'cancelled', 'refunded')),
  amount DECIMAL(10,2), -- Amount in currency (can be null for non-monetary transactions)
  currency TEXT DEFAULT 'USD',
  description TEXT,
  payment_method TEXT, -- e.g., 'mpesa', 'card', 'paypal', 'trial', 'free'
  payment_provider TEXT, -- e.g., 'safaricom', 'stripe', 'paypal'
  provider_transaction_id TEXT, -- External provider's transaction ID
  error_message TEXT, -- Error details if transaction failed
  success_message TEXT, -- Success details if transaction succeeded
  metadata JSONB, -- Additional transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE, -- When transaction was processed
  expires_at TIMESTAMP WITH TIME ZONE -- For pending transactions
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON public.transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_transaction_id ON public.transactions(provider_transaction_id);

-- Create updated_at trigger function (only if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON public.transactions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert any transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update any transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete any transactions" ON public.transactions;

-- Create RLS Policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert any transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update any transactions" ON public.transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete any transactions" ON public.transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create or replace function to create a transaction
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id UUID,
  p_transaction_id TEXT,
  p_type TEXT,
  p_status TEXT,
  p_amount DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT 'USD',
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
  -- Insert the transaction
  INSERT INTO public.transactions (
    user_id,
    transaction_id,
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
    p_user_id,
    p_transaction_id,
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

-- Create or replace function to update transaction status
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
DECLARE
  updated_transaction RECORD;
BEGIN
  -- Update the transaction
  UPDATE public.transactions
  SET 
    status = p_status,
    error_message = COALESCE(p_error_message, error_message),
    success_message = COALESCE(p_success_message, success_message),
    provider_transaction_id = COALESCE(p_provider_transaction_id, provider_transaction_id),
    metadata = COALESCE(p_metadata, metadata),
    processed_at = CASE 
      WHEN p_status IN ('success', 'failed', 'cancelled', 'refunded') THEN NOW()
      ELSE processed_at
    END,
    updated_at = NOW()
  WHERE transaction_id = p_transaction_id
  RETURNING * INTO updated_transaction;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Transaction updated successfully',
    'transaction', updated_transaction
  );
END;
$$;

-- Create or replace function to get all transactions for admin
CREATE OR REPLACE FUNCTION public.admin_get_all_transactions(
  p_limit INTEGER DEFAULT 100,
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
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM public.transactions t
  WHERE (p_status IS NULL OR t.status = p_status)
    AND (p_type IS NULL OR t.type = p_type)
    AND (p_user_id IS NULL OR t.user_id = p_user_id);

  -- Get transactions with user info
  SELECT json_agg(
    json_build_object(
      'id', t.id,
      'transaction_id', t.transaction_id,
      'user_id', t.user_id,
      'user_email', t.email,
      'user_username', t.username,
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
    SELECT t.*, p.email, p.username
    FROM public.transactions t
    LEFT JOIN public.profiles p ON t.user_id = p.user_id
    WHERE (p_status IS NULL OR t.status = p_status)
      AND (p_type IS NULL OR t.type = p_type)
      AND (p_user_id IS NULL OR t.user_id = p_user_id)
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
