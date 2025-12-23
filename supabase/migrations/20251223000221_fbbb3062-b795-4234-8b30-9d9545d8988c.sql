-- Add delay columns to settings table
ALTER TABLE public.settings 
ADD COLUMN alert_start_delay_seconds integer DEFAULT 0;

ALTER TABLE public.settings 
ADD COLUMN alert_between_delay_seconds integer DEFAULT 1;