-- Drop existing policy
DROP POLICY IF EXISTS "Public can create transactions" ON public.transactions;

-- Create new policy that allows both anon and authenticated users
CREATE POLICY "Public can create transactions"
ON public.transactions
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending'::text);