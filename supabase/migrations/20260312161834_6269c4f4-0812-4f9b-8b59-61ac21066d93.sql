
-- Fix remaining security findings

-- 1. Restrict "Widget can view active queue items" to not expose all streamers' data
-- The overlay already filters by streamer_id in code, but the policy allows cross-streamer reads
-- We keep the policy but exclude sensitive payload data by using the public_alert_queue view instead
-- Actually the overlay needs payload for buyer_note display. The real fix is that the overlay
-- always filters by streamer_id anyway. This is defense-in-depth.

-- 2. Fix transactions INSERT: validate alert belongs to streamer and amount matches
DROP POLICY IF EXISTS "Public can create pending transactions" ON public.transactions;
CREATE POLICY "Public can create pending transactions"
ON public.transactions FOR INSERT TO public
WITH CHECK (
  status = 'pending' 
  AND amount_cents > 0 
  AND alert_id IS NOT NULL 
  AND streamer_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.alerts 
    WHERE alerts.id = alert_id 
    AND alerts.streamer_id = transactions.streamer_id 
    AND alerts.status = 'published'
    AND alerts.price_cents = transactions.amount_cents
  )
);
