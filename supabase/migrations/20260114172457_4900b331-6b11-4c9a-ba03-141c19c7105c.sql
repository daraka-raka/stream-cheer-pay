-- Add RLS policy to the streamer_mp_status view to restrict access to own data
-- Views with security_invoker need explicit policies on the base tables they reference
-- But since we removed the SELECT policy from streamer_mp_config for authenticated users,
-- we need to add a proper RLS-enabled view or use a function approach

-- Drop the existing view and recreate with proper security model
DROP VIEW IF EXISTS public.streamer_mp_status;

-- Create a security definer function to safely get MP status
CREATE OR REPLACE FUNCTION public.get_mp_connection_status(p_streamer_id uuid)
RETURNS TABLE(
  streamer_id uuid,
  mp_user_id text,
  is_connected boolean,
  token_expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller owns this streamer
  IF NOT EXISTS (
    SELECT 1 FROM public.streamers 
    WHERE id = p_streamer_id AND auth_user_id = auth.uid()
  ) THEN
    RETURN; -- Return empty if not owner
  END IF;
  
  RETURN QUERY
  SELECT 
    mc.streamer_id,
    mc.mp_user_id,
    (mc.mp_access_token IS NOT NULL AND mc.mp_access_token != '')::boolean as is_connected,
    mc.token_expires_at,
    mc.created_at,
    mc.updated_at
  FROM public.streamer_mp_config mc
  WHERE mc.streamer_id = p_streamer_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_mp_connection_status(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_mp_connection_status IS 
'Secure function exposing MP connection status without revealing OAuth tokens. 
Returns empty if caller does not own the streamer.';