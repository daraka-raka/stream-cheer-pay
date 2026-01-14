-- Drop the streamer_mp_status view that is causing the security warning
-- The secure function get_mp_connection_status provides the same functionality with proper authorization
DROP VIEW IF EXISTS public.streamer_mp_status;