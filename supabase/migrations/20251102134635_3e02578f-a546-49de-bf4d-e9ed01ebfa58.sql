-- Drop the overly permissive public policy on streamers table
DROP POLICY IF EXISTS "Public can view streamer profiles by handle" ON public.streamers;

-- Create a public view that excludes sensitive fields (email, auth_user_id, public_key, email_verified)
CREATE OR REPLACE VIEW public.public_streamer_profiles AS
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
COMMENT ON VIEW public.public_streamer_profiles IS 'Public view of streamer profiles excluding sensitive PII like email addresses';