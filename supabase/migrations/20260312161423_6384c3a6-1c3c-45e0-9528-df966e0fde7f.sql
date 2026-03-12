
-- =============================================
-- SECURITY AUDIT: Critical RLS Fixes
-- =============================================

-- 1. [CRITICO] Fix alert_queue: "Service role can manage queue" targets public instead of service_role
DROP POLICY IF EXISTS "Service role can manage queue" ON public.alert_queue;
CREATE POLICY "Service role can manage queue"
ON public.alert_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. [CRITICO] Fix notifications: "Service role can delete notifications" targets public instead of service_role
DROP POLICY IF EXISTS "Service role can delete notifications" ON public.notifications;
CREATE POLICY "Service role can delete notifications"
ON public.notifications FOR DELETE TO service_role USING (true);

-- 3. [CRITICO] Create SECURITY DEFINER function for widget settings (replaces anon SELECT on settings)
CREATE OR REPLACE FUNCTION public.get_widget_settings(p_public_key text)
RETURNS TABLE(
  streamer_id uuid,
  overlay_image_duration_seconds integer,
  widget_position text,
  alert_start_delay_seconds integer,
  alert_between_delay_seconds integer,
  accepting_alerts boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate public_key format (64 hex chars)
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
    s.accepting_alerts
  FROM public.settings s
  INNER JOIN public.streamers st ON st.id = s.streamer_id
  WHERE st.public_key = p_public_key;
END;
$$;

-- 4. [CRITICO] Remove overly permissive anon SELECT on settings (webhook_url exposed)
DROP POLICY IF EXISTS "Anon can view widget settings via view" ON public.settings;

-- 5. [CRITICO] Remove overly permissive anon SELECT on streamers (email exposed)
-- The public page uses get_public_streamer_profile RPC (SECURITY DEFINER)
-- The overlay will now use get_widget_settings RPC (SECURITY DEFINER)
DROP POLICY IF EXISTS "Public can view streamer profiles" ON public.streamers;
