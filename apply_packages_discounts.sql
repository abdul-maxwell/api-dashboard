-- Apply packages and discounts tables manually
-- This script creates the packages and discounts tables with all necessary features

-- Create packages table for dynamic pricing management
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL, -- e.g., '1_month', '3_months', '1_year'
  duration_days INTEGER NOT NULL, -- actual days for calculation
  price_ksh DECIMAL(10,2) NOT NULL,
  original_price_ksh DECIMAL(10,2), -- for showing discounts
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb, -- array of features
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create discounts table for promo codes and percentage discounts
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  promo_code TEXT UNIQUE, -- unique promo code
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL, -- percentage (0-100) or fixed amount
  min_amount DECIMAL(10,2) DEFAULT 0, -- minimum order amount
  max_discount DECIMAL(10,2), -- maximum discount amount (for percentage)
  usage_limit INTEGER, -- total usage limit
  usage_count INTEGER DEFAULT 0, -- current usage count
  user_limit INTEGER DEFAULT 1, -- usage limit per user
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_packages UUID[] DEFAULT '{}', -- array of package IDs (empty = all packages)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create user_discount_usage table to track individual usage
CREATE TABLE IF NOT EXISTS public.user_discount_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  discount_id UUID NOT NULL REFERENCES public.discounts(id),
  usage_count INTEGER DEFAULT 1,
  first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, discount_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packages_active ON public.packages(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_sort ON public.packages(sort_order);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON public.discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_promo_code ON public.discounts(promo_code);
CREATE INDEX IF NOT EXISTS idx_discounts_valid_dates ON public.discounts(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_user_discount_usage_user ON public.user_discount_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discount_usage_discount ON public.user_discount_usage(discount_id);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discount_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for packages (readable by all authenticated users)
DROP POLICY IF EXISTS "Packages are viewable by authenticated users" ON public.packages;
CREATE POLICY "Packages are viewable by authenticated users" ON public.packages
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for discounts (readable by all authenticated users)
DROP POLICY IF EXISTS "Active discounts are viewable by authenticated users" ON public.discounts;
CREATE POLICY "Active discounts are viewable by authenticated users" ON public.discounts
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS Policies for user discount usage (users can only see their own usage)
DROP POLICY IF EXISTS "Users can view their own discount usage" ON public.user_discount_usage;
CREATE POLICY "Users can view their own discount usage" ON public.user_discount_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (only admins can modify)
DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages" ON public.packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;
CREATE POLICY "Admins can manage discounts" ON public.discounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage user discount usage" ON public.user_discount_usage;
CREATE POLICY "Admins can manage user discount usage" ON public.user_discount_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discounts_updated_at ON public.discounts;
CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default packages
INSERT INTO public.packages (name, description, duration, duration_days, price_ksh, original_price_ksh, is_featured, sort_order, features) VALUES
('Starter', 'Perfect for getting started with our API', '1_month', 30, 500.00, 500.00, false, 1, '["Basic API access", "Email support", "Standard rate limits"]'),
('Professional', 'Great for growing businesses', '3_months', 90, 1200.00, 1500.00, true, 2, '["Advanced API access", "Priority support", "Higher rate limits", "Analytics dashboard"]'),
('Enterprise', 'For large-scale applications', '1_year', 365, 4000.00, 5000.00, false, 3, '["Full API access", "24/7 support", "Unlimited rate limits", "Custom integrations", "Dedicated account manager"]')
ON CONFLICT DO NOTHING;

-- Insert sample discount
INSERT INTO public.discounts (name, description, promo_code, discount_type, discount_value, min_amount, max_discount, usage_limit, valid_until) VALUES
('Welcome Discount', '20% off for new users', 'WELCOME20', 'percentage', 20.00, 0, 1000.00, 100, NOW() + INTERVAL '30 days')
ON CONFLICT (promo_code) DO NOTHING;
