-- Fix the search path for calculate_expiration_date function
CREATE OR REPLACE FUNCTION public.calculate_expiration_date(duration_type api_key_duration)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  CASE duration_type
    WHEN '1_week' THEN
      RETURN now() + INTERVAL '7 days';
    WHEN '30_days' THEN
      RETURN now() + INTERVAL '30 days';
    WHEN '60_days' THEN
      RETURN now() + INTERVAL '60 days';
    WHEN 'forever' THEN
      RETURN NULL;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;