-- Create function to create users (admin only)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_username TEXT,
  p_password TEXT,
  p_role TEXT DEFAULT 'user'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  new_user_id UUID;
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
  
  -- Validate inputs
  IF p_email IS NULL OR p_username IS NULL OR p_password IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email, username, and password are required'
    );
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A user with this email already exists'
    );
  END IF;
  
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Username is already taken'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('user', 'admin', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid role. Must be user, admin, or super_admin'
    );
  END IF;
  
  -- Create a profile record with NULL user_id initially
  -- The user_id will be set when the user actually signs up
  INSERT INTO public.profiles (
    user_id,
    email,
    username,
    role
  ) VALUES (
    NULL, -- user_id will be set when user signs up
    p_email,
    p_username,
    p_role::user_role
  ) RETURNING id INTO new_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User profile created successfully. The user can now sign up with these credentials.',
    'profile_id', new_user_id,
    'email', p_email,
    'username', p_username,
    'role', p_role
  );
END;
$$;

-- Create function to link profile to auth user when they sign up
CREATE OR REPLACE FUNCTION public.link_profile_to_user(
  p_email TEXT,
  p_auth_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Find the profile with matching email and NULL user_id
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE email = p_email AND user_id IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No pending profile found for this email'
    );
  END IF;
  
  -- Update the profile with the auth user_id
  UPDATE public.profiles 
  SET user_id = p_auth_user_id
  WHERE id = profile_record.id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Profile linked to auth user successfully',
    'profile_id', profile_record.id,
    'username', profile_record.username,
    'role', profile_record.role
  );
END;
$$;

-- Create function to update user details
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id UUID,
  p_email TEXT,
  p_username TEXT,
  p_role TEXT,
  p_new_password TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
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
  
  -- Validate inputs
  IF p_user_id IS NULL OR p_email IS NULL OR p_username IS NULL OR p_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User ID, email, username, and role are required'
    );
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Check if email already exists for another user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email AND user_id != p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A user with this email already exists'
    );
  END IF;
  
  -- Check if username already exists for another user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username AND user_id != p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Username is already taken'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('user', 'admin', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid role. Must be user, admin, or super_admin'
    );
  END IF;
  
  -- Update profile
  UPDATE public.profiles 
  SET 
    email = p_email,
    username = p_username,
    role = p_role::user_role,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User updated successfully',
    'user_id', p_user_id,
    'email', p_email,
    'username', p_username,
    'role', p_role
  );
END;
$$;
