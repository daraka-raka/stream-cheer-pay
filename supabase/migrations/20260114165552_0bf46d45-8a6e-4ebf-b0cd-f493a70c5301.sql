-- ===========================================
-- SECURITY FIX: Notifications INSERT Policy
-- ===========================================
-- Remove the overly permissive INSERT policy that allows anyone to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a restrictive policy that only allows service_role (edge functions) to insert
CREATE POLICY "Service role can create notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- ===========================================
-- SECURITY FIX: Alert Queue UPDATE Policy
-- ===========================================
-- Remove the policy that allows any user to update any streamer's queue
DROP POLICY IF EXISTS "Widget can update queue status via public_key" ON public.alert_queue;

-- Create a policy that requires authentication and ownership
CREATE POLICY "Streamers can update their own queue status"
ON public.alert_queue
FOR UPDATE
TO authenticated
USING (
  streamer_id IN (
    SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (status IN ('playing', 'finished'));

-- ===========================================
-- SECURITY FIX: Test Mode Transaction UPDATE Policy
-- ===========================================
-- Remove the policy that allows anonymous users to update test transactions
DROP POLICY IF EXISTS "Allow updates for test mode transactions" ON public.transactions;

-- Create a policy that requires authentication AND ownership for test mode updates
CREATE POLICY "Streamers can update own test transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.alerts a
    JOIN public.streamers s ON s.id = a.streamer_id
    WHERE a.id = transactions.alert_id 
    AND a.test_mode = true
    AND s.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  status IN ('pending', 'paid', 'failed')
);

-- ===========================================
-- SECURITY FIX: MercadoPago Config Write Policies
-- ===========================================
-- Add explicit policies for INSERT, UPDATE, DELETE (service_role only)
CREATE POLICY "Service role can insert mp config"
ON public.streamer_mp_config
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update mp config"
ON public.streamer_mp_config
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete mp config"
ON public.streamer_mp_config
FOR DELETE
TO service_role
USING (true);

-- ===========================================
-- SECURITY FIX: Public RPC Input Validation
-- ===========================================
-- Replace the SECURITY DEFINER function with proper input validation
CREATE OR REPLACE FUNCTION public.get_public_streamer_profile(p_handle text)
RETURNS TABLE(
  id uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  handle character varying, 
  display_name character varying, 
  bio character varying, 
  photo_url text, 
  public_key text, 
  accepting_alerts boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate handle format (3-50 chars, lowercase alphanumeric + _ -)
  IF p_handle IS NULL OR 
     LENGTH(p_handle) < 3 OR 
     LENGTH(p_handle) > 50 OR
     p_handle !~ '^[a-z0-9_-]+$' THEN
    RAISE EXCEPTION 'Invalid handle format';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.created_at,
    s.updated_at,
    s.handle,
    s.display_name,
    s.bio,
    s.photo_url,
    s.public_key,
    COALESCE(st.accepting_alerts, true) as accepting_alerts
  FROM public.streamers s
  LEFT JOIN public.settings st ON st.streamer_id = s.id
  WHERE s.handle = p_handle;
END;
$$;