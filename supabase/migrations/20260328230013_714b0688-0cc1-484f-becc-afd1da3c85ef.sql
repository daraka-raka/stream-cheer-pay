
DROP FUNCTION IF EXISTS public.get_widget_settings(text);

CREATE OR REPLACE FUNCTION public.get_widget_settings(p_public_key text)
 RETURNS TABLE(streamer_id uuid, overlay_image_duration_seconds integer, widget_position text, alert_start_delay_seconds integer, alert_between_delay_seconds integer, accepting_alerts boolean, show_alert_title_on_overlay boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_public_key IS NULL OR LENGTH(p_public_key) < 10 OR LENGTH(p_public_key) > 128 THEN
    RAISE EXCEPTION 'Invalid public key format';
  END IF;

  RETURN QUERY
  SELECT 
    s.streamer_id,
    s.overlay_image_duration_seconds,
    s.widget_position,
    s.alert_start_delay_seconds,
    s.alert_between_delay_seconds,
    s.accepting_alerts,
    s.show_alert_title_on_overlay
  FROM public.settings s
  INNER JOIN public.streamers st ON st.id = s.streamer_id
  WHERE st.public_key = p_public_key;
END;
$function$;
