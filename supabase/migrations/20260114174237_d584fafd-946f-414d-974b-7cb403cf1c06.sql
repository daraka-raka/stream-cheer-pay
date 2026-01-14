-- Adicionar coluna para retenção de notificações
ALTER TABLE public.settings 
ADD COLUMN notification_retention_days INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.settings.notification_retention_days IS 
'Dias para manter notificações. NULL = manter para sempre. Valores: 1, 7, 30';

-- Adicionar policy DELETE para service role em notifications
CREATE POLICY "Service role can delete notifications"
ON public.notifications FOR DELETE
USING (true);