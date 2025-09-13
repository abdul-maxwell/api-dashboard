-- Test the fixed admin function
-- Run these queries in Supabase SQL Editor

-- 1. Test if you're authenticated as admin
SELECT 
  auth.uid() as current_user_id,
  public.is_admin() as is_admin_result;

-- 2. Test the fixed function
SELECT * FROM public.admin_get_all_users();

-- 3. If the function still fails, try this simpler version
SELECT 
  p.user_id,
  p.email,
  p.username,
  p.role,
  p.created_at,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ak.id,
        'name', ak.name,
        'key_value', ak.key_value,
        'duration', ak.duration,
        'expires_at', ak.expires_at,
        'is_active', ak.is_active,
        'status', ak.status
      )
    )
    FROM public.api_keys ak
    WHERE ak.user_id = p.user_id
  ) as api_keys
FROM public.profiles p
ORDER BY p.created_at DESC;

