-- Add columns for optional dashboard cards
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS show_ticket_medio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_taxa_conversao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_pendentes BOOLEAN DEFAULT false;