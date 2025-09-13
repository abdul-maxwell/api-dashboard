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
DROP POLICY IF EXISTS "Admins can view all admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "Admins can create admin actions" ON public.admin_actions;

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

-- Admin actions policies
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

-- Admin functions for managing users and API keys
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(user_id uuid, email text, username text, role user_role, created_at timestamp with time zone, api_keys jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.username,
    p.role,
    p.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ak.id,
            'name', ak.name,
            'key_value', ak.key_value,
            'duration', ak.duration,
            'expires_at', ak.expires_at,
            'is_active', ak.is_active,
            'api_key_type', ak.api_key_type,
            'is_trial', ak.is_trial,
            'status', ak.status,
            'paused_until', ak.paused_until,
            'paused_reason', ak.paused_reason,
            'created_by_admin', ak.created_by_admin,
            'admin_notes', ak.admin_notes,
            'created_at', ak.created_at,
            'last_used_at', ak.last_used_at
          )
        )
        FROM public.api_keys ak
        WHERE ak.user_id = p.user_id
        ORDER BY ak.created_at DESC
      ),
      '[]'::jsonb
    ) as api_keys
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_api_key(
  p_target_user_id uuid,
  p_name text,
  p_duration_type text,
  p_custom_days integer DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  api_key_value TEXT;
  duration_type api_key_duration;
  expires_at TIMESTAMP WITH TIME ZONE;
  result JSON;
BEGIN
  -- Check if current user is admin
  admin_user_id := auth.uid();
  IF NOT public.is_admin(admin_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied. Admin privileges required.'
    );
  END IF;
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Target user not found'
    );
  END IF;
  
  -- Deactivate existing active API keys for the user
  UPDATE public.api_keys 
  SET status = 'inactive', is_active = false
  WHERE user_id = p_target_user_id AND status = 'active';
  
  -- Generate new API key
  api_key_value := 'ak_' || encode(gen_random_bytes(32), 'base64url');
  
  -- Calculate expiration based on duration type
  IF p_duration_type = 'custom' AND p_custom_days IS NOT NULL THEN
    duration_type := 'forever';
    expires_at := now() + (p_custom_days || ' days')::INTERVAL;
  ELSE
    CASE p_duration_type
      WHEN '1_week' THEN
        duration_type := '1_week';
        expires_at := now() + INTERVAL '7 days';
      WHEN '1_month' THEN
        duration_type := '30_days';
        expires_at := now() + INTERVAL '30 days';
      WHEN '2_months' THEN
        duration_type := '60_days';
        expires_at := now() + INTERVAL '60 days';
      WHEN '1_year' THEN
        duration_type := 'forever';
        expires_at := now() + INTERVAL '1 year';
      WHEN 'lifetime' THEN
        duration_type := 'forever';
        expires_at := NULL;
      ELSE
        RETURN json_build_object(
          'success', false,
          'message', 'Invalid duration type'
        );
    END CASE;
  END IF;
  
  -- Create the API key
  INSERT INTO public.api_keys (
    user_id,
    key_value,
    name,
    duration,
    expires_at,
    is_active,
    api_key_type,
    is_trial,
    status,
    created_by_admin,
    admin_notes
  ) VALUES (
    p_target_user_id,
    api_key_value,
    p_name,
    duration_type,
    expires_at,
    true,
    'paid',
    false,
    'active',
    true,
    p_admin_notes
  );
  
  -- Log the admin action
  INSERT INTO public.admin_actions (
    admin_user_id,
    target_user_id,
    action_type,
    details
  ) VALUES (
    admin_user_id,
    p_target_user_id,
    'create_api_key',
    json_build_object(
      'api_key_name', p_name,
      'duration_type', p_duration_type,
      'custom_days', p_custom_days,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'API key created successfully',
    'api_key', api_key_value,
    'expires_at', expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_manage_api_key(
  p_api_key_id uuid,
  p_action text,
  p_pause_days integer DEFAULT NULL,
  p_pause_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  api_key_record RECORD;
  result JSON;
BEGIN
  -- Check if current user is admin
  admin_user_id := auth.uid();
  IF NOT public.is_admin(admin_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied. Admin privileges required.'
    );
  END IF;
  
  -- Get the API key record
  SELECT * INTO api_key_record 
  FROM public.api_keys 
  WHERE id = p_api_key_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'API key not found'
    );
  END IF;
  
  -- Perform the requested action
  CASE p_action
    WHEN 'delete' THEN
      DELETE FROM public.api_keys WHERE id = p_api_key_id;
      
    WHEN 'deactivate' THEN
      UPDATE public.api_keys 
      SET status = 'inactive', is_active = false
      WHERE id = p_api_key_id;
      
    WHEN 'pause' THEN
      IF p_pause_days IS NULL THEN
        RETURN json_build_object(
          'success', false,
          'message', 'Pause days required for pause action'
        );
      END IF;
      
      UPDATE public.api_keys 
      SET 
        status = 'paused',
        is_active = false,
        paused_until = now() + (p_pause_days || ' days')::INTERVAL,
        paused_reason = p_pause_reason
      WHERE id = p_api_key_id;
      
    WHEN 'activate' THEN
      UPDATE public.api_keys 
      SET 
        status = 'active',
        is_active = true,
        paused_until = NULL,
        paused_reason = NULL
      WHERE id = p_api_key_id;
      
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'Invalid action'
      );
  END CASE;
  
  -- Log the admin action
  INSERT INTO public.admin_actions (
    admin_user_id,
    target_user_id,
    target_api_key_id,
    action_type,
    details
  ) VALUES (
    admin_user_id,
    api_key_record.user_id,
    p_api_key_id,
    p_action,
    json_build_object(
      'pause_days', p_pause_days,
      'pause_reason', p_pause_reason
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Action completed successfully'
  );
END;
$$;