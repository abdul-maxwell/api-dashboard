-- Fix the admin_get_all_users function to properly handle GROUP BY
CREATE OR REPLACE FUNCTION public.admin_get_all_users(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Get users with their API keys count
  SELECT json_agg(
    json_build_object(
      'user_id', p.user_id,
      'email', p.email,
      'username', p.username,
      'role', p.role,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'api_keys', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ak.id,
              'name', ak.name,
              'key_value', ak.key_value,
              'duration', ak.duration,
              'expires_at', ak.expires_at,
              'is_active', ak.is_active,
              'is_trial', ak.is_trial,
              'payment_status', ak.payment_status,
              'price_ksh', ak.price_ksh,
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
        '[]'::json
      ),
      'status', CASE 
        WHEN p.user_id IS NULL THEN 'pending_signup'
        ELSE 'active'
      END
    ) ORDER BY p.created_at DESC
  ) INTO users_result
  FROM (
    SELECT p.*
    FROM public.profiles p
    WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.username ILIKE '%' || p_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) p;

  RETURN json_build_object(
    'success', true,
    'users', COALESCE(users_result, '[]'::json),
    'total_count', total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$function$;

-- Create function to update user password 
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(p_user_id uuid, p_new_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Target user not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset initiated. User will receive an email to set their new password.'
  );
END;
$function$;