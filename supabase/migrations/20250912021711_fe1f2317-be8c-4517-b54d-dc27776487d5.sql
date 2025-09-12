-- Add trial tracking and payment status to api_keys table
ALTER TABLE public.api_keys 
ADD COLUMN is_trial BOOLEAN DEFAULT false,
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_id TEXT,
ADD COLUMN price_ksh DECIMAL(10,2) DEFAULT 0;

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
ON public.payments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for payments table timestamps
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user function to create free trial API key
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Create free trial API key (7 days)
  INSERT INTO public.api_keys (
    user_id, 
    name, 
    key_value, 
    duration, 
    expires_at, 
    is_trial,
    payment_status,
    price_ksh
  )
  VALUES (
    NEW.id,
    'Free Trial Key',
    'ztmd_' || encode(gen_random_bytes(20), 'base64url'),
    '1_week',
    now() + INTERVAL '7 days',
    true,
    'completed',
    0
  );
  
  RETURN NEW;
END;
$$;