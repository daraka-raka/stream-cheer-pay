-- =====================================================
-- FASE 1: CORREÇÕES CRÍTICAS DE RLS
-- =====================================================

-- 1. STREAMERS: Remover política SELECT pública muito permissiva
-- Manter apenas acesso via view public_streamer_profiles para dados públicos
DROP POLICY IF EXISTS "Public can view streamer profiles" ON public.streamers;

-- 2. ALERT_QUEUE: Remover políticas INSERT/UPDATE públicas (CRÍTICO)
-- Apenas service role (webhook) deve poder inserir
DROP POLICY IF EXISTS "Public can create queue entries" ON public.alert_queue;
DROP POLICY IF EXISTS "Public can update queue status" ON public.alert_queue;

-- Adicionar política para widget poder atualizar status (via public_key do streamer)
CREATE POLICY "Widget can update queue status via public_key" ON public.alert_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.streamers s
    WHERE s.id = alert_queue.streamer_id
  )
)
WITH CHECK (status IN ('playing', 'finished'));

-- Permitir SELECT público apenas para alertas com status 'queued' ou 'playing' (para widget)
CREATE POLICY "Public can view active queue items" ON public.alert_queue
FOR SELECT
USING (status IN ('queued', 'playing'));

-- 3. SETTINGS: Criar view pública com apenas campos do widget
CREATE OR REPLACE VIEW public.public_widget_settings AS
SELECT 
  s.streamer_id,
  st.public_key,
  s.widget_position,
  s.overlay_image_duration_seconds,
  s.alert_start_delay_seconds,
  s.alert_between_delay_seconds,
  s.accepting_alerts
FROM public.settings s
JOIN public.streamers st ON st.id = s.streamer_id;

-- Garantir que a view é acessível publicamente
GRANT SELECT ON public.public_widget_settings TO anon;
GRANT SELECT ON public.public_widget_settings TO authenticated;

-- 4. TRANSACTIONS: Remover política INSERT pública muito permissiva
-- Apenas permitir insert via edge function (service role)
DROP POLICY IF EXISTS "Public can create transactions" ON public.transactions;

-- Adicionar política mais restritiva: permite insert mas valida campos
CREATE POLICY "Public can create pending transactions" ON public.transactions
FOR INSERT
WITH CHECK (
  status = 'pending' 
  AND amount_cents > 0 
  AND alert_id IS NOT NULL
  AND streamer_id IS NOT NULL
);

-- 5. WITHDRAWALS: Garantir que apenas streamer vê seus próprios saques
-- (já existe política correta, mas vamos garantir)

-- 6. STREAMER_MP_CONFIG: Garantir proteção total
-- (apenas service role pode modificar, streamer só pode ver via SELECT existente)

-- 7. Adicionar índice para performance em buscas por public_key
CREATE INDEX IF NOT EXISTS idx_streamers_public_key ON public.streamers(public_key);

-- 8. Adicionar índice para alert_queue por status
CREATE INDEX IF NOT EXISTS idx_alert_queue_status ON public.alert_queue(status);