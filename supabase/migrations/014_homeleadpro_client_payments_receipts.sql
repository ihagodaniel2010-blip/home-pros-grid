-- 014_homeleadpro_client_payments_receipts.sql
-- HomeLeadPro / Barrigudo
-- Expande a tabela estimate_payments_manual para suportar Client Payments & Receipts

-- 1. Tornar estimate_id opcional
ALTER TABLE public.estimate_payments_manual ALTER COLUMN estimate_id DROP NOT NULL;

-- 2. Adicionar novos relacionamentos
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS service_job_id uuid REFERENCES public.service_jobs(id) ON DELETE SET NULL;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

-- 3. Adicionar campos de Receipt e Tracking
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS status text DEFAULT 'received' CHECK (status IN ('draft', 'received', 'cancelled'));

-- 3.1. public_token com default seguro (UUID) e índice explícito
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE public.estimate_payments_manual ALTER COLUMN public_token SET DEFAULT gen_random_uuid()::text;

UPDATE public.estimate_payments_manual
SET public_token = gen_random_uuid()::text
WHERE public_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS estimate_payments_manual_public_token_uidx
ON public.estimate_payments_manual(public_token)
WHERE public_token IS NOT NULL;

ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS receipt_status text DEFAULT 'draft' CHECK (receipt_status IN ('draft', 'sent', 'viewed', 'cancelled'));
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 4. Ajustar payment_method CHECK constraint
ALTER TABLE public.estimate_payments_manual DROP CONSTRAINT IF EXISTS estimate_payments_manual_method_check;
ALTER TABLE public.estimate_payments_manual ADD CONSTRAINT estimate_payments_manual_method_check CHECK (method IN ('zelle', 'venmo', 'cash_app', 'bank_transfer', 'cash', 'check', 'external_card', 'card', 'other'));

-- 5. RPC get_receipt_by_token (Acesso público seguro)
CREATE OR REPLACE FUNCTION public.get_receipt_by_token(token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_record record;
BEGIN
  -- Validação de segurança: token nulo ou menor que 20 chars
  IF token IS NULL OR length(trim(token)) < 20 THEN 
    RETURN NULL; 
  END IF;

  -- Seleção restrita: sem estimate_id, service_job_id, organization_id, etc.
  SELECT 
    epm.id as receipt_number,
    epm.amount,
    epm.method,
    epm.payment_date,
    epm.note,
    epm.customer_name,
    epm.receipt_status,
    epm.public_token,
    org.name as company_name
  INTO receipt_record
  FROM public.estimate_payments_manual epm
  JOIN public.organizations org ON org.id = epm.organization_id
  WHERE epm.public_token = token
  AND epm.status != 'cancelled'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Marcar como viewed atualizando apenas se viewed_at for nulo
  IF receipt_record.receipt_status IN ('draft', 'sent') THEN
    UPDATE public.estimate_payments_manual
    SET 
      receipt_status = 'viewed', 
      viewed_at = coalesce(viewed_at, now())
    WHERE id = receipt_record.receipt_number;
  END IF;

  RETURN row_to_json(receipt_record);
END;
$$;

-- 5.1. Conceder permissão para anon e authenticated executarem a RPC limpando PUBLIC primeiro
REVOKE ALL ON FUNCTION public.get_receipt_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_receipt_by_token(text) TO anon, authenticated;

-- 6. RLS (Garantir que a tabela está blindada)
ALTER TABLE public.estimate_payments_manual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin has all privileges on manual payments" ON public.estimate_payments_manual;
DROP POLICY IF EXISTS "Company managers can manage manual payments" ON public.estimate_payments_manual;

CREATE POLICY "Super admin has all privileges on manual payments"
ON public.estimate_payments_manual
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "Company managers can manage manual payments"
ON public.estimate_payments_manual
FOR ALL
USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));
