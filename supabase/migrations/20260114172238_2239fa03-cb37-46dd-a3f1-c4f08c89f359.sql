-- Create a secure view that exposes only connection status, not actual tokens
-- This prevents XSS attacks from stealing access tokens

-- First, create the status-only view
CREATE OR REPLACE VIEW public.streamer_mp_status
WITH (security_invoker = true) AS
SELECT 
  streamer_id,
  mp_user_id,
  (mp_access_token IS NOT NULL AND mp_access_token != '') as is_connected,
  token_expires_at,
  created_at,
  updated_at
FROM public.streamer_mp_config;

-- Grant access to authenticated users
GRANT SELECT ON public.streamer_mp_status TO authenticated;

-- Now drop the existing SELECT policy on streamer_mp_config that exposes tokens
DROP POLICY IF EXISTS "Streamers can view own mp config" ON public.streamer_mp_config;

-- Create a restrictive policy that only allows service_role to read the actual tokens
-- This means edge functions can still access tokens, but client-side code cannot
CREATE POLICY "Only service role can read mp config"
ON public.streamer_mp_config
FOR SELECT
TO service_role
USING (true);

-- Add a comment explaining the security model
COMMENT ON VIEW public.streamer_mp_status IS 
'Secure view exposing MP connection status without revealing actual OAuth tokens. 
Use this view from client-side code instead of directly querying streamer_mp_config.
Edge functions use service_role to access actual tokens when needed.';