-- Recriar view com SECURITY INVOKER para usar permissões do usuário
DROP VIEW IF EXISTS public.public_streamer_profiles;

CREATE VIEW public.public_streamer_profiles 
WITH (security_invoker = true)
AS
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
LEFT JOIN public.settings st ON st.streamer_id = s.id;