-- Tabela para armazenar configurações OAuth do Mercado Pago dos streamers
CREATE TABLE public.streamer_mp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id uuid NOT NULL UNIQUE REFERENCES public.streamers(id) ON DELETE CASCADE,
  mp_access_token text NOT NULL,
  mp_refresh_token text,
  mp_user_id text NOT NULL,
  mp_public_key text,
  commission_rate numeric DEFAULT 0.10, -- 10% comissão padrão da plataforma
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.streamer_mp_config ENABLE ROW LEVEL SECURITY;

-- Streamers podem visualizar apenas sua própria config
CREATE POLICY "Streamers can view own mp config"
  ON public.streamer_mp_config FOR SELECT
  USING (streamer_id IN (
    SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_streamer_mp_config_updated_at
  BEFORE UPDATE ON public.streamer_mp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();