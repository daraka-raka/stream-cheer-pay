-- 1. Política para widget acessar alertas que estão na fila
CREATE POLICY "Widget can view alerts in queue"
ON public.alerts
FOR SELECT
TO anon
USING (
  id IN (
    SELECT alert_id FROM public.alert_queue
    WHERE status IN ('queued', 'playing')
  )
);

-- 2. Política para widget acessar itens ativos da fila
CREATE POLICY "Widget can view active queue for anon"
ON public.alert_queue
FOR SELECT
TO anon
USING (status IN ('queued', 'playing'));