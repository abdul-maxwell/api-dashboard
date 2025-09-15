-- Add admin policies for packages and discounts
-- Run this AFTER the profiles table has been created

-- Admin policies for packages
DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages" ON public.packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for discounts
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;
CREATE POLICY "Admins can manage discounts" ON public.discounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for user discount usage
DROP POLICY IF EXISTS "Admins can manage user discount usage" ON public.user_discount_usage;
CREATE POLICY "Admins can manage user discount usage" ON public.user_discount_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
