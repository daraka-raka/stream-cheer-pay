/*
  # Create Withdrawals Table

  ## Overview
  This migration creates the withdrawals table for streamers to request
  payouts of their earnings via PIX (Brazilian instant payment system).

  ## New Tables
  
  ### withdrawals
  - `id` (uuid, primary key) - Unique identifier for each withdrawal request
  - `streamer_id` (uuid, foreign key) - Links to streamers table
  - `amount_cents` (integer) - Amount to withdraw in cents (minimum 10000 = R$100)
  - `pix_key` (text) - PIX key for the transfer
  - `status` (text) - Current status: pending, processing, completed, rejected
  - `requested_at` (timestamptz) - When the withdrawal was requested
  - `processed_at` (timestamptz) - When the withdrawal was completed/rejected
  - `notes` (text) - Admin notes or rejection reasons
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ## Security
  - RLS enabled on withdrawals table
  - Streamers can only view their own withdrawal requests
  - Streamers can create new withdrawal requests
  - Only admins (via service role) can update withdrawal status

  ## Important Notes
  - Minimum withdrawal amount is R$100.00 (10000 cents)
  - PIX key validation should be done at application level
  - Status transitions should be: pending -> processing -> completed/rejected
*/

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 10000),
  pix_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies for withdrawals
DROP POLICY IF EXISTS "Streamers can view their own withdrawals" ON public.withdrawals;
CREATE POLICY "Streamers can view their own withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (streamer_id IN (
  SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()
));

DROP POLICY IF EXISTS "Streamers can create their own withdrawals" ON public.withdrawals;
CREATE POLICY "Streamers can create their own withdrawals"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (streamer_id IN (
  SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER update_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_streamer_id ON public.withdrawals(streamer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);