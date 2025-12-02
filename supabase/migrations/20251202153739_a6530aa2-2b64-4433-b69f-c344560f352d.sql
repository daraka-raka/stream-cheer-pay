-- Add advanced preferences columns to settings table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS webhook_url text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS notify_on_milestone boolean DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS milestone_amount_cents integer DEFAULT 100000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS widget_position text DEFAULT 'center';