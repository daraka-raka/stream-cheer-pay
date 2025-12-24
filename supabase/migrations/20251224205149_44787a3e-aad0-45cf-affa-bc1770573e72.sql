-- Corrigir a view para usar SECURITY INVOKER (padrão) em vez de SECURITY DEFINER
-- Recriar a view sem SECURITY DEFINER para que respeite RLS do usuário que consulta
DROP VIEW IF EXISTS public.public_widget_settings;

CREATE VIEW public.public_widget_settings 
WITH (security_invoker = true) AS
SELECT 
  s.streamer_id,
  st.public_key,
  s.widget_position,
  s.overlay_image_duration_seconds,
  s.alert_start_delay_seconds,
  s.alert_between_delay_seconds,
  s.accepting_alerts
FROM public.settings s
JOIN public.streamers st ON st.id = s.streamer_id;

-- Garantir acesso público à view (dados não sensíveis)
GRANT SELECT ON public.public_widget_settings TO anon;
GRANT SELECT ON public.public_widget_settings TO authenticated;