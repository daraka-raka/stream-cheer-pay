-- Fix critical security issues: grants, constraints, and validation

-- 1. Re-apply GRANT on public_streamer_profiles view (critical for public access)
GRANT SELECT ON public.public_streamer_profiles TO anon, authenticated;

-- 2. Apply VARCHAR constraints to prevent DoS attacks
-- Note: We need to drop and recreate the view first to avoid dependency issues
DROP VIEW IF EXISTS public.public_streamer_profiles;

-- Apply constraints to streamers table
ALTER TABLE public.streamers
ALTER COLUMN display_name TYPE VARCHAR(100),
ALTER COLUMN handle TYPE VARCHAR(50),
ALTER COLUMN bio TYPE VARCHAR(1000);

-- Add format validation for handle
ALTER TABLE public.streamers
ADD CONSTRAINT handle_format CHECK (handle ~* '^[a-z0-9_-]{3,50}$');

-- Apply constraints to alerts table
ALTER TABLE public.alerts
ALTER COLUMN title TYPE VARCHAR(200),
ALTER COLUMN description TYPE VARCHAR(1000);

-- Apply constraints to transactions table
ALTER TABLE public.transactions
ALTER COLUMN buyer_note TYPE VARCHAR(500);

-- Apply constraints to withdrawals table
ALTER TABLE public.withdrawals
ALTER COLUMN pix_key TYPE VARCHAR(100);

-- Add PIX key minimum length validation
ALTER TABLE public.withdrawals
ADD CONSTRAINT pix_key_min_length CHECK (LENGTH(pix_key) >= 11);

-- 3. Recreate the public view with proper grants
CREATE VIEW public.public_streamer_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  handle,
  display_name,
  bio,
  photo_url,
  public_key,
  created_at,
  updated_at
FROM public.streamers;

-- Grant SELECT permissions to anon and authenticated roles
GRANT SELECT ON public.public_streamer_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_streamer_profiles IS 'Public view of streamer profiles excluding sensitive PII. Includes public_key for widget access. Accessible by anonymous and authenticated users.';

-- 4. Ensure transactions cannot be updated by regular users (only server via service role)
-- Drop any existing update policies
DROP POLICY IF EXISTS "Users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Public can update transactions" ON public.transactions;

-- Only allow SELECT and INSERT for authenticated streamers viewing their own data
-- Updates will be done by server-side webhooks using service role