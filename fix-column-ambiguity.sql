-- Fix column ambiguity in admin function
-- Run this in Supabase SQL Editor

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
        FROM (
          SELECT * FROM public.api_keys 
          WHERE public.api_keys.user_id = p.user_id
          ORDER BY public.api_keys.created_at DESC
        ) ak
      ),
      '[]'::jsonb
    ) as api_keys
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Also create a test function without admin check
CREATE OR REPLACE FUNCTION public.test_get_all_users()
RETURNS TABLE(user_id uuid, email text, username text, role user_role, created_at timestamp with time zone, api_keys jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        FROM (
          SELECT * FROM public.api_keys 
          WHERE public.api_keys.user_id = p.user_id
          ORDER BY public.api_keys.created_at DESC
        ) ak
      ),
      '[]'::jsonb
    ) as api_keys
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Test the function without admin check first
SELECT 'Testing function without admin check:' as info;
SELECT * FROM public.test_get_all_users();
