-- Allow public/anonymous users to create pending transactions
CREATE POLICY "Public can create transactions"
ON public.transactions
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- Allow public to insert into alert queue
CREATE POLICY "Public can create queue entries"
ON public.alert_queue
FOR INSERT
TO anon
WITH CHECK (status = 'queued');