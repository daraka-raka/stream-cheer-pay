-- Add public_key to the public_streamer_profiles view
-- The public_key is safe to expose as it's used for public widget URLs
DROP VIEW IF EXISTS public.public_streamer_profiles;

CREATE VIEW public.public_streamer_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  handle,
  display_name,
  bio,
  photo_url,
  public_key,  -- Added for widget access
  created_at,
  updated_at
FROM public.streamers;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_streamer_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_streamer_profiles IS 'Public view of streamer profiles excluding sensitive PII. Includes public_key for widget access.';