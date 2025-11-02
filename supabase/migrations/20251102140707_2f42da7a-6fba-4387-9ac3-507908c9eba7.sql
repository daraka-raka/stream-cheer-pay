-- Recreate the view with SECURITY INVOKER to use querying user's permissions
-- This prevents privilege escalation and ensures RLS is properly enforced
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
  created_at,
  updated_at
FROM public.streamers;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_streamer_profiles TO anon, authenticated;

-- Add comment explaining the view purpose
COMMENT ON VIEW public.public_streamer_profiles IS 'Public view of streamer profiles excluding sensitive PII like email addresses. Uses security_invoker for proper RLS enforcement.';