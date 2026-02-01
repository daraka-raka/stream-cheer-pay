
-- Permitir acesso anônimo de leitura à tabela streamers para views públicas
CREATE POLICY "Public can view streamer profiles"
ON public.streamers
FOR SELECT
TO anon, authenticated
USING (true);

-- Permitir acesso anônimo de leitura à tabela settings para views públicas
CREATE POLICY "Public can view settings for widget"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (true);
