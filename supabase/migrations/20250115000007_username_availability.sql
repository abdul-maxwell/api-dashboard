-- Create function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_availability(
  p_username TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_exists BOOLEAN;
BEGIN
  -- Check if username already exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE username = p_username
  ) INTO username_exists;
  
  RETURN json_build_object(
    'available', NOT username_exists,
    'username', p_username,
    'message', CASE 
      WHEN username_exists THEN 'Username is already taken'
      ELSE 'Username is available'
    END
  );
END;
$$;

-- Create function to get user by username or email for login
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
  -- Try to find user by username first, then by email
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
