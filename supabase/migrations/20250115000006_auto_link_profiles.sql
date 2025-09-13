-- Create trigger to automatically link profiles when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Look for a pending profile with matching email
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE email = NEW.email AND user_id IS NULL
  LIMIT 1;
  
  -- If found, link the profile to the new auth user
  IF FOUND THEN
    UPDATE public.profiles 
    SET user_id = NEW.id
    WHERE id = profile_record.id;
    
    -- Log the linking (optional)
    RAISE NOTICE 'Linked profile % to auth user %', profile_record.id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
