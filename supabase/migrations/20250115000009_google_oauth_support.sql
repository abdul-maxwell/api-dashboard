-- Add support for Google OAuth users
-- This migration handles profile creation for Google OAuth users

-- Create function to handle Google OAuth user profile creation
CREATE OR REPLACE FUNCTION public.handle_google_oauth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_from_email TEXT;
  username_base TEXT;
  counter INTEGER := 1;
  final_username TEXT;
BEGIN
  -- Extract username from email (part before @)
  username_from_email := split_part(NEW.email, '@', 1);
  
  -- Clean the username (remove special characters, make lowercase)
  username_base := lower(regexp_replace(username_from_email, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure minimum length
  IF length(username_base) < 3 THEN
    username_base := username_base || 'user';
  END IF;
  
  -- Start with the base username
  final_username := username_base;
  
  -- Check if username exists and generate unique one
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := username_base || counter;
    counter := counter + 1;
  END LOOP;
  
  -- Insert or update profile for the Google OAuth user
  INSERT INTO public.profiles (
    user_id,
    email,
    username,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    final_username,
    'user'::user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Create trigger for Google OAuth users
DROP TRIGGER IF EXISTS on_google_auth_user_created ON auth.users;
CREATE TRIGGER on_google_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.app_metadata->>'provider' = 'google')
  EXECUTE FUNCTION public.handle_google_oauth_user();

-- Create function to get or create profile for existing Google users
CREATE OR REPLACE FUNCTION public.ensure_google_user_profile(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  username_from_email TEXT;
  username_base TEXT;
  counter INTEGER := 1;
  final_username TEXT;
BEGIN
  -- Get user information
  SELECT * INTO user_record 
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Profile already exists'
    );
  END IF;
  
  -- Extract username from email
  username_from_email := split_part(user_record.email, '@', 1);
  username_base := lower(regexp_replace(username_from_email, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure minimum length
  IF length(username_base) < 3 THEN
    username_base := username_base || 'user';
  END IF;
  
  -- Start with the base username
  final_username := username_base;
  
  -- Check if username exists and generate unique one
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := username_base || counter;
    counter := counter + 1;
  END LOOP;
  
  -- Create profile
  INSERT INTO public.profiles (
    user_id,
    email,
    username,
    role,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    user_record.email,
    final_username,
    'user'::user_role,
    NOW(),
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'username', final_username
  );
END;
$$;
