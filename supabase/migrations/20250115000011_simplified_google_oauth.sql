-- Simplified Google OAuth support without triggers
-- This migration focuses on the essential functions without complex triggers

-- Function to get or create profile for existing Google users
CREATE OR REPLACE FUNCTION public.ensure_google_user_profile(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  profile_exists BOOLEAN;
BEGIN
  -- Check if a profile already exists for this user_id
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) INTO profile_exists;

  IF profile_exists THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Profile already exists for this user'
    );
  END IF;

  -- Get user details from auth.users
  SELECT * INTO user_record FROM auth.users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Auth user not found'
    );
  END IF;

  -- Create profile (without username - user will set it in username setup)
  INSERT INTO public.profiles (
    user_id,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    user_record.email,
    'user'::user_role,
    NOW(),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully - username setup required'
  );
END;
$$;
