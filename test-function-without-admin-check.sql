-- Test function without admin check (for debugging only)
-- This will help us see if the function works when admin check is bypassed

CREATE OR REPLACE FUNCTION public.test_get_all_users()
RETURNS TABLE(user_id uuid, email text, username text, role user_role, created_at timestamp with time zone, api_keys jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No admin check for testing
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
          WHERE user_id = p.user_id
          ORDER BY created_at DESC
        ) ak
      ),
      '[]'::jsonb
    ) as api_keys
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Test the function
SELECT 'Testing function without admin check:' as info;
SELECT * FROM public.test_get_all_users();
