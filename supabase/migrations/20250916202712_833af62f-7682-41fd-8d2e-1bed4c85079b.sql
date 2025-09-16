-- Fix the admin_get_all_users function by removing non-existent column references
CREATE OR REPLACE FUNCTION public.admin_get_all_users(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  users_result JSON;
  total_count INTEGER;
  admin_user_id UUID;
BEGIN
  -- Check if current user is admin
  admin_user_id := auth.uid();
  IF NOT public.is_admin(admin_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Access denied. Admin privileges required.'
    );
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM public.profiles p
  WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.username ILIKE '%' || p_search || '%');

  -- Get users with their API keys (fixed column references)
  WITH user_data AS (
    SELECT p.*
    FROM public.profiles p
    WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.username ILIKE '%' || p_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT json_agg(
    json_build_object(
      'user_id', ud.user_id,
      'email', ud.email,
      'username', ud.username,
      'role', ud.role,
      'created_at', ud.created_at,
      'updated_at', ud.updated_at,
      'api_keys', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ak.id,
              'name', ak.name,
              'key_value', ak.key_value,
              'expires_at', ak.expires_at,
              'is_active', ak.is_active,
              'is_trial', ak.is_trial,
              'price_ksh', ak.price_ksh,
              'created_by_admin', ak.created_by_admin,
              'admin_notes', ak.admin_notes,
              'created_at', ak.created_at,
              'last_used_at', ak.last_used_at,
              'status', ak.status
            )
          )
          FROM public.api_keys ak
          WHERE ak.user_id = ud.user_id
          ORDER BY ak.created_at DESC
        ),
        '[]'::json
      ),
      'status', CASE 
        WHEN ud.user_id IS NULL THEN 'pending_signup'
        ELSE 'active'
      END
    )
  ) INTO users_result
  FROM user_data ud;

  RETURN json_build_object(
    'success', true,
    'users', COALESCE(users_result, '[]'::json),
    'total_count', total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;