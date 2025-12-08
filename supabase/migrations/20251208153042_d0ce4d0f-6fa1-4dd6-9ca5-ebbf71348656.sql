-- Allow the widget (anon/authenticated) to update queue status
CREATE POLICY "Public can update queue status"
  ON public.alert_queue FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (status IN ('playing', 'finished'));