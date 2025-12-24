-- Função que valida integridade das transações
CREATE OR REPLACE FUNCTION public.validate_transaction_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Não permite criar transação já paga diretamente
  IF TG_OP = 'INSERT' AND NEW.status = 'paid' THEN
    RAISE EXCEPTION 'Transações não podem ser criadas com status paid diretamente';
  END IF;
  
  -- Não permite atualizar para paid sem stripe_payment_id válido
  IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND 
     (NEW.stripe_payment_id IS NULL OR NEW.stripe_payment_id = '') THEN
    RAISE EXCEPTION 'Transações só podem ser marcadas como paid via webhook de pagamento com stripe_payment_id válido';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger que aplica a validação
DROP TRIGGER IF EXISTS enforce_transaction_integrity ON public.transactions;
CREATE TRIGGER enforce_transaction_integrity
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_status();