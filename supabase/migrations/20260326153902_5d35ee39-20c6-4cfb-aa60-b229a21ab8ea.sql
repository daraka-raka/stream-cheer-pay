-- 1. Remove anon direct access to alert_queue (payload exposed)
DROP POLICY IF EXISTS "Widget can view active queue items" ON public.alert_queue;

-- 2. Fix withdrawals policies: 'public' -> 'authenticated'
DROP POLICY IF EXISTS "Streamers can create their own withdrawals" ON public.withdrawals;
CREATE POLICY "Streamers can create their own withdrawals"
  ON public.withdrawals
  FOR INSERT
  TO authenticated
  WITH CHECK (streamer_id IN (
    SELECT id FROM streamers WHERE auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Streamers can view their own withdrawals" ON public.withdrawals;
CREATE POLICY "Streamers can view their own withdrawals"
  ON public.withdrawals
  FOR SELECT
  TO authenticated
  USING (streamer_id IN (
    SELECT id FROM streamers WHERE auth_user_id = auth.uid()
  ));

-- 3. Recreate public_alert_queue view WITHOUT payload column
DROP VIEW IF EXISTS public.public_alert_queue;
CREATE VIEW public.public_alert_queue AS
SELECT
  aq.id,
  aq.streamer_id,
  aq.alert_id,
  aq.transaction_id,
  aq.status,
  aq.is_test,
  aq.enqueued_at,
  aq.started_at,
  aq.finished_at
FROM public.alert_queue aq
WHERE aq.status IN ('queued', 'playing');

GRANT SELECT ON public.public_alert_queue TO anon;
GRANT SELECT ON public.public_alert_queue TO authenticated;