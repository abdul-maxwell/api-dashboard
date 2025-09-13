-- Fix infinite recursion in RLS policies by creating security definer functions
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_admin.user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;

-- Create new safe policies using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all API keys" 
ON public.api_keys 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (public.is_admin());

-- Add admin management policies
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.is_admin());

CREATE POLICY "Admins can insert API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all API keys" 
ON public.api_keys 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete all API keys" 
ON public.api_keys 
FOR DELETE 
USING (public.is_admin());

-- Create admin tables
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid,
  target_api_key_id uuid,
  action_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin actions" 
ON public.admin_actions 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can create admin actions" 
ON public.admin_actions 
FOR INSERT 
WITH CHECK (auth.uid() = admin_user_id AND public.is_admin());

-- Add status and pause fields to API keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'status') THEN
        ALTER TABLE public.api_keys ADD COLUMN status text DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'paused_until') THEN
        ALTER TABLE public.api_keys ADD COLUMN paused_until timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'paused_reason') THEN
        ALTER TABLE public.api_keys ADD COLUMN paused_reason text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'created_by_admin') THEN
        ALTER TABLE public.api_keys ADD COLUMN created_by_admin boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'admin_notes') THEN
        ALTER TABLE public.api_keys ADD COLUMN admin_notes text;
    END IF;
END $$;