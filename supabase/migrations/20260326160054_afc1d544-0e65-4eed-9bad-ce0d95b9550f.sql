
-- Fix alerts policies: restrict INSERT and DELETE from 'public' to 'authenticated'

DROP POLICY IF EXISTS "Streamers can create their own alerts" ON public.alerts;
CREATE POLICY "Streamers can create their own alerts"
  ON public.alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (streamer_id IN (
    SELECT id FROM streamers WHERE auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Streamers can delete their own alerts" ON public.alerts;
CREATE POLICY "Streamers can delete their own alerts"
  ON public.alerts
  FOR DELETE
  TO authenticated
  USING (streamer_id IN (
    SELECT id FROM streamers WHERE auth_user_id = auth.uid()
  ));

-- Also fix UPDATE policy while we're at it
DROP POLICY IF EXISTS "Streamers can update their own alerts" ON public.alerts;
CREATE POLICY "Streamers can update their own alerts"
  ON public.alerts
  FOR UPDATE
  TO authenticated
  USING (streamer_id IN (
    SELECT id FROM streamers WHERE auth_user_id = auth.uid()
  ));

-- Fix Streamers can view their own alerts to authenticated
DROP POLICY IF EXISTS "Streamers can view their own alerts" ON public.alerts;
CREATE POLICY "Streamers can view their own alerts"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (streamer_id IN (
    SELECT id FROM streamers WHERE auth_user_id = auth.uid()
  ));
