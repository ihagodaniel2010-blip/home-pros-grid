-- 014_test_client_payments_receipts_rollback.sql
-- HomeLeadPro / Barrigudo
-- Teste Autônomo e Rollback da Fase 6.3

BEGIN;

-- ============================================================================
-- PASSO 1: APLICAR SCHEMA TEMPORARIAMENTE
-- ============================================================================
ALTER TABLE public.estimate_payments_manual ALTER COLUMN estimate_id DROP NOT NULL;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS service_job_id uuid REFERENCES public.service_jobs(id) ON DELETE SET NULL;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS status text DEFAULT 'received' CHECK (status IN ('draft', 'received', 'cancelled'));

ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE public.estimate_payments_manual ALTER COLUMN public_token SET DEFAULT gen_random_uuid()::text;
UPDATE public.estimate_payments_manual SET public_token = gen_random_uuid()::text WHERE public_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS estimate_payments_manual_public_token_uidx ON public.estimate_payments_manual(public_token) WHERE public_token IS NOT NULL;

ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS receipt_status text DEFAULT 'draft' CHECK (receipt_status IN ('draft', 'sent', 'viewed', 'cancelled'));
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.estimate_payments_manual ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.estimate_payments_manual DROP CONSTRAINT IF EXISTS estimate_payments_manual_method_check;
ALTER TABLE public.estimate_payments_manual ADD CONSTRAINT estimate_payments_manual_method_check CHECK (method IN ('zelle', 'venmo', 'cash_app', 'bank_transfer', 'cash', 'check', 'external_card', 'card', 'other'));

CREATE OR REPLACE FUNCTION public.get_receipt_by_token(token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_record record;
BEGIN
  IF token IS NULL OR length(trim(token)) < 20 THEN RETURN NULL; END IF;

  SELECT epm.id as receipt_number, epm.amount, epm.method, epm.payment_date, epm.note, epm.customer_name, epm.receipt_status,
         epm.public_token, org.name as company_name
  INTO receipt_record
  FROM public.estimate_payments_manual epm
  JOIN public.organizations org ON org.id = epm.organization_id
  WHERE epm.public_token = token AND epm.status != 'cancelled' LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  IF receipt_record.receipt_status IN ('draft', 'sent') THEN
    UPDATE public.estimate_payments_manual SET receipt_status = 'viewed', viewed_at = coalesce(viewed_at, now())
    WHERE id = receipt_record.receipt_number;
  END IF;

  RETURN row_to_json(receipt_record);
END;
$$;

REVOKE ALL ON FUNCTION public.get_receipt_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_receipt_by_token(text) TO anon, authenticated;

-- RLS
ALTER TABLE public.estimate_payments_manual ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin has all privileges on manual payments" ON public.estimate_payments_manual;
DROP POLICY IF EXISTS "Company managers can manage manual payments" ON public.estimate_payments_manual;
CREATE POLICY "Super admin has all privileges on manual payments" ON public.estimate_payments_manual FOR ALL USING (public.is_super_admin());
CREATE POLICY "Company managers can manage manual payments" ON public.estimate_payments_manual FOR ALL USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin')) WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

-- ============================================================================
-- PASSO 2: TESTAR FUNCIONALIDADES
-- ============================================================================
DO $$
DECLARE
  v_org_id uuid;
  v_other_org_id uuid;
  v_owner_id uuid;
  v_worker_id uuid;
  v_estimate_id uuid;
  v_token text;
  v_payment_id uuid;
  v_receipt json;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  SELECT id INTO v_other_org_id FROM public.organizations WHERE id != v_org_id LIMIT 1;
  IF v_org_id IS NULL THEN RAISE NOTICE 'Skipping tests: no organization found.'; RETURN; END IF;

  SELECT user_id INTO v_owner_id FROM public.organization_users WHERE organization_id = v_org_id AND role = 'owner' LIMIT 1;
  SELECT user_id INTO v_worker_id FROM public.organization_users WHERE organization_id = v_org_id AND role = 'worker' LIMIT 1;
  IF v_owner_id IS NULL THEN RAISE NOTICE 'Skipping tests: no owner found.'; RETURN; END IF;
  
  SELECT id INTO v_estimate_id FROM public.estimates WHERE organization_id = v_org_id LIMIT 1;
  
  -- Setup de RLS test mode para Owner
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_owner_id), true);
  PERFORM set_config('role', 'authenticated', true);

  -- Teste 1: Owner cria sem estimate
  INSERT INTO public.estimate_payments_manual (organization_id, amount, method, payment_date)
  VALUES (v_org_id, 100.00, 'cash', now()) RETURNING id, public_token INTO v_payment_id, v_token;
  RAISE NOTICE 'Passou: Owner criou sem estimate.';
  
  -- Teste 2: Owner cria com estimate
  IF v_estimate_id IS NOT NULL THEN
    INSERT INTO public.estimate_payments_manual (organization_id, estimate_id, amount, method, payment_date)
    VALUES (v_org_id, v_estimate_id, 200.00, 'card', now());
    RAISE NOTICE 'Passou: Owner criou com estimate.';
  END IF;

  -- Teste 3: Public_token unico via Exception
  BEGIN
    INSERT INTO public.estimate_payments_manual (organization_id, amount, method, payment_date, public_token)
    VALUES (v_org_id, 50.00, 'cash', now(), v_token);
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Token não é UNIQUE!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Passou: Token bloqueia duplicidade.';
  END;

  -- Teste 4: Cross-tenant bloqueado
  IF v_other_org_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.estimate_payments_manual (organization_id, amount, method, payment_date)
      VALUES (v_other_org_id, 100.00, 'cash', now());
      RAISE EXCEPTION 'FALHA DE SEGURANÇA: Owner conseguiu inserir em outra org!';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'Passou: Owner não acessa outra organization_id para insert.';
      WHEN others THEN
        IF SQLERRM ILIKE '%row-level security%' THEN
          RAISE NOTICE 'Passou: RLS barrou Cross-Tenant.';
        ELSE
          RAISE;
        END IF;
    END;
  END IF;

  -- Teste 5: Worker access
  IF v_worker_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_worker_id), true);
    
    IF (SELECT count(*) FROM public.estimate_payments_manual WHERE organization_id = v_org_id) > 0 THEN
      RAISE EXCEPTION 'FALHA DE SEGURANÇA: Worker consegue SELECT!';
    END IF;
    
    BEGIN
      INSERT INTO public.estimate_payments_manual (organization_id, amount, method, payment_date)
      VALUES (v_org_id, 100.00, 'cash', now());
      RAISE EXCEPTION 'FALHA DE SEGURANÇA: Worker conseguiu INSERT!';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'Passou: Worker bloqueado para leitura e escrita.';
      WHEN others THEN
        IF SQLERRM ILIKE '%row-level security%' THEN
          RAISE NOTICE 'Passou: RLS barrou Worker.';
        ELSE
          RAISE;
        END IF;
    END;
  END IF;
  
  -- Sair de role
  PERFORM set_config('role', 'postgres', true);

  -- Teste 6: RPC e view_at
  v_receipt := public.get_receipt_by_token(v_token);
  IF v_receipt IS NULL THEN RAISE EXCEPTION 'FALHA: RPC falhou ou bloqueada.'; END IF;
  IF v_receipt->>'organization_id' IS NOT NULL THEN RAISE EXCEPTION 'FALHA: RPC vazou organization_id.'; END IF;
  IF v_receipt->>'estimate_id' IS NOT NULL THEN RAISE EXCEPTION 'FALHA: RPC vazou estimate_id.'; END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.estimate_payments_manual WHERE id = v_payment_id AND viewed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'FALHA: RPC não atualizou viewed_at.';
  END IF;
  RAISE NOTICE 'Passou: RPC retorna dados super restritos e marca viewed_at.';

END $$;

-- ============================================================================
-- PASSO 3: ROLLBACK (DESFAZ TUDO APLICADO NO BEGIN)
-- ============================================================================
ROLLBACK;
