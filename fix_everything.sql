-- Fix Everything - Complete Database Restoration
-- This will fix all the issues and restore the system to working state

-- Step 1: Ensure all basic tables exist
DO $$ 
BEGIN
    -- Create user_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin');
    END IF;
    
    -- Create api_key_duration enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_duration') THEN
        CREATE TYPE public.api_key_duration AS ENUM ('1_week', '30_days', '60_days', 'forever');
    END IF;
END $$;

-- Step 2: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create api_keys table if it doesn't exist
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

-- Step 4: Create transactions table if it doesn't exist
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

-- Step 5: Create payments table if it doesn't exist
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

-- Step 6: Create notifications table if it doesn't exist
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

-- Step 7: Create packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_ksh DECIMAL(10,2) NOT NULL,
  duration api_key_duration NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 8: Create discounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_packages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 9: Create user_discount_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_discount_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, discount_id)
);

-- Step 10: Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discount_usage ENABLE ROW LEVEL SECURITY;

-- Step 11: Create all necessary RLS policies
-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- API Keys policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
CREATE POLICY "Users can create their own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update their own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Packages policies (viewable by all authenticated users)
DROP POLICY IF EXISTS "Packages are viewable by authenticated users" ON public.packages;
CREATE POLICY "Packages are viewable by authenticated users" ON public.packages FOR SELECT USING (auth.role() = 'authenticated');

-- Discounts policies (viewable by all authenticated users)
DROP POLICY IF EXISTS "Discounts are viewable by authenticated users" ON public.discounts;
CREATE POLICY "Discounts are viewable by authenticated users" ON public.discounts FOR SELECT USING (auth.role() = 'authenticated');

-- User discount usage policies
DROP POLICY IF EXISTS "Users can view their own discount usage" ON public.user_discount_usage;
CREATE POLICY "Users can view their own discount usage" ON public.user_discount_usage FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own discount usage" ON public.user_discount_usage;
CREATE POLICY "Users can create their own discount usage" ON public.user_discount_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 12: Create all necessary functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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

-- Step 13: Create triggers
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

DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_discounts_updated_at ON public.discounts;
CREATE TRIGGER update_discounts_updated_at
BEFORE UPDATE ON public.discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Step 14: Insert default packages
INSERT INTO public.packages (name, description, price_ksh, duration, features, is_active, is_featured, sort_order)
VALUES 
  ('Basic Plan', 'Perfect for getting started', 500.00, '1_week', '["Basic API access", "1 week validity", "Email support"]', true, false, 1),
  ('Standard Plan', 'Most popular choice', 1500.00, '30_days', '["Full API access", "30 days validity", "Priority support", "Advanced features"]', true, true, 2),
  ('Premium Plan', 'For power users', 2500.00, '60_days', '["Full API access", "60 days validity", "24/7 support", "All features", "Priority processing"]', true, false, 3),
  ('Enterprise Plan', 'Unlimited access', 5000.00, 'forever', '["Unlimited API access", "Lifetime validity", "Dedicated support", "All features", "Custom integrations"]', true, false, 4)
ON CONFLICT DO NOTHING;

-- Step 15: Insert sample discount
INSERT INTO public.discounts (promo_code, name, description, discount_type, discount_value, usage_limit, valid_until, is_active)
VALUES 
  ('WELCOME20', 'Welcome Discount', '20% off your first purchase', 'percentage', 20.00, 100, now() + interval '1 year', true),
  ('SAVE50', 'Fixed Discount', 'Save 50 KES on any plan', 'fixed', 50.00, 50, now() + interval '6 months', true)
ON CONFLICT (promo_code) DO NOTHING;

-- Step 16: Ensure admin user exists and has proper role
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@zetechmd.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Update or create admin profile
        INSERT INTO public.profiles (user_id, email, username, role, created_at, updated_at)
        VALUES (admin_user_id, 'admin@zetechmd.com', 'admin', 'admin', now(), now())
        ON CONFLICT (user_id) DO UPDATE SET
          role = 'admin',
          username = 'admin',
          email = 'admin@zetechmd.com',
          updated_at = now();
    END IF;
END $$;

-- Success message
SELECT 'Database restoration completed successfully! All tables, functions, policies, and default data have been created.' as message;
