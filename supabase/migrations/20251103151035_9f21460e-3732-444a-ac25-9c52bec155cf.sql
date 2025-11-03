-- Fix warn-level security issues

-- 1. Fix Function Search Path Mutable
-- The update_updated_at function is missing SET search_path
-- Recreate it with proper search_path configuration
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Implement Test Mode for Payment System
-- Add test_mode flag to alerts table
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT false;

-- Allow transaction updates ONLY for test mode alerts
-- This enables testing payment flows without real payment integration
CREATE POLICY "Allow updates for test mode transactions"
ON public.transactions FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.alerts 
    WHERE alerts.id = transactions.alert_id 
    AND alerts.test_mode = true
  )
)
WITH CHECK (
  status IN ('pending', 'paid', 'failed') 
  AND EXISTS (
    SELECT 1 FROM public.alerts 
    WHERE alerts.id = transactions.alert_id 
    AND alerts.test_mode = true
  )
);

COMMENT ON COLUMN public.alerts.test_mode IS 'When true, allows test payments without Stripe integration. Should be disabled for production alerts.';
