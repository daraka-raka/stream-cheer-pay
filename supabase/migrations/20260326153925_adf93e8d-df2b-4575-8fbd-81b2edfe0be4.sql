-- Add payload back to public_alert_queue view - buyer_note is intentionally public (shown on stream)
DROP VIEW IF EXISTS public.public_alert_queue;
CREATE VIEW public.public_alert_queue WITH (security_invoker = true) AS
SELECT
  aq.id,
  aq.streamer_id,
  aq.alert_id,
  aq.transaction_id,
  aq.status,
  aq.is_test,
  aq.payload,
  aq.enqueued_at,
  aq.started_at,
  aq.finished_at
FROM public.alert_queue aq
WHERE aq.status IN ('queued', 'playing');

GRANT SELECT ON public.public_alert_queue TO anon;
GRANT SELECT ON public.public_alert_queue TO authenticated;

-- Re-add anon SELECT on alert_queue for realtime subscriptions (filtered to queued/playing only)
CREATE POLICY "Widget can view active queue items"
  ON public.alert_queue
  FOR SELECT
  TO anon
  USING (status IN ('queued', 'playing'));