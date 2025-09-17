-- Add missing duration column to api_keys table
ALTER TABLE public.api_keys ADD COLUMN duration text DEFAULT '30_days';

-- Update existing API keys to have duration based on their expiration
UPDATE public.api_keys 
SET duration = CASE 
  WHEN expires_at IS NULL THEN 'forever'
  WHEN expires_at <= now() + INTERVAL '7 days' THEN '1_week'
  WHEN expires_at <= now() + INTERVAL '30 days' THEN '30_days'
  WHEN expires_at <= now() + INTERVAL '60 days' THEN '60_days'
  WHEN expires_at <= now() + INTERVAL '365 days' THEN '1_year'
  ELSE 'forever'
END
WHERE duration IS NULL;