-- Create SECURITY DEFINER function to safely expose public streamer data
CREATE OR REPLACE FUNCTION public.get_public_streamer_profile(p_handle text)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  handle varchar,
  display_name varchar,
  bio varchar,
  photo_url text,
  public_key text,
  accepting_alerts boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT 
    s.id,
    s.created_at,
    s.updated_at,
    s.handle,
    s.display_name,
    s.bio,
    s.photo_url,
    s.public_key,
    COALESCE(st.accepting_alerts, true) as accepting_alerts
  FROM public.streamers s
  LEFT JOIN public.settings st ON st.streamer_id = s.id
  WHERE s.handle = p_handle;
$$;

-- Grant execute permissions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_streamer_profile(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_streamer_profile(text) TO authenticated;