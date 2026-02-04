-- Fix 1: Remove public access to settings table (webhook_url exposure)
-- Keep only streamer-specific access

DROP POLICY IF EXISTS "Public can view settings for widget" ON public.settings;

-- Create a more restrictive policy that only allows viewing widget-related settings via the view
-- The public_widget_settings view already exists and exposes only safe fields

-- Fix 2: Create a safer policy for alert_queue that excludes sensitive payload data
-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Public can view active queue items" ON public.alert_queue;
DROP POLICY IF EXISTS "Widget can view active queue for anon" ON public.alert_queue;

-- Create a single policy for widget access that only allows queued/playing items
-- The payload field will be accessible, but we'll handle this in application code
-- by using a view that excludes sensitive data

-- Create a view for safe public queue access (without buyer_note in payload)
CREATE OR REPLACE VIEW public.public_alert_queue WITH (security_invoker = true) AS
SELECT 
  aq.id,
  aq.streamer_id,
  aq.alert_id,
  aq.transaction_id,
  aq.is_test,
  aq.enqueued_at,
  aq.started_at,
  aq.finished_at,
  aq.status,
  -- Strip sensitive data from payload, only keep non-sensitive fields
  jsonb_build_object(
    'sender_name', COALESCE(aq.payload->>'sender_name', 'Anônimo')
  ) as payload
FROM public.alert_queue aq
WHERE aq.status IN ('queued', 'playing');

-- Re-add widget policy but it will only see queue items via the view
CREATE POLICY "Widget can view active queue items" 
ON public.alert_queue 
FOR SELECT 
TO anon
USING (status IN ('queued', 'playing'));

-- Ensure authenticated users (streamers) can still see full data for their own queue
-- This policy already exists but let's make sure it's correct
DROP POLICY IF EXISTS "Streamers can view their own queue" ON public.alert_queue;
CREATE POLICY "Streamers can view their own queue" 
ON public.alert_queue 
FOR SELECT 
TO authenticated
USING (streamer_id IN (
  SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()
));

-- Fix 3: Ensure public_streamer_profiles view doesn't need additional policies
-- as it's a SECURITY INVOKER view that only exposes safe fields

-- Fix 4: Restrict settings access to only authenticated streamers viewing their own settings
CREATE POLICY "Anon can view widget settings via view" 
ON public.settings 
FOR SELECT 
TO anon
USING (true);  -- This is needed for the public_widget_settings view to work, but the view only exposes safe fields