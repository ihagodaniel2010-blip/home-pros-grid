-- 015_test_estimate_assistant_drafts_rollback.sql
-- HomeLeadPro / Barrigudo
-- Teste Autônomo e Rollback da Fase 6.4 (Estimate Assistant Drafts)

BEGIN;

-- ============================================================================
-- PASSO 1: APLICAR SCHEMA TEMPORARIAMENTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.estimate_assistant_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    service_type text NOT NULL,
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    output jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'converted', 'deleted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS estimate_assistant_drafts_org_idx ON public.estimate_assistant_drafts(organization_id);
CREATE INDEX IF NOT EXISTS estimate_assistant_drafts_lead_idx ON public.estimate_assistant_drafts(lead_id);
CREATE INDEX IF NOT EXISTS estimate_assistant_drafts_status_idx ON public.estimate_assistant_drafts(status);

ALTER TABLE public.estimate_assistant_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin has all privileges on estimate assistant drafts" ON public.estimate_assistant_drafts;
DROP POLICY IF EXISTS "Company managers can manage estimate assistant drafts" ON public.estimate_assistant_drafts;

CREATE POLICY "Super admin has all privileges on estimate assistant drafts"
ON public.estimate_assistant_drafts
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "Company managers can manage estimate assistant drafts"
ON public.estimate_assistant_drafts
FOR ALL
USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_estimate_assistant_drafts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_estimate_assistant_drafts_updated_at ON public.estimate_assistant_drafts;
CREATE TRIGGER update_estimate_assistant_drafts_updated_at
    BEFORE UPDATE ON public.estimate_assistant_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_estimate_assistant_drafts();


-- ============================================================================
-- PASSO 2: TESTAR FUNCIONALIDADES
-- ============================================================================
DO $$
DECLARE
  v_org_id uuid;
  v_other_org_id uuid;
  v_owner_id uuid;
  v_worker_id uuid;
  v_draft_id uuid;
BEGIN
  -- Identificar organizações de teste
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  SELECT id INTO v_other_org_id FROM public.organizations WHERE id != v_org_id LIMIT 1;
  IF v_org_id IS NULL THEN RAISE NOTICE 'Skipping tests: no organization found.'; RETURN; END IF;

  -- Identificar usuários
  SELECT user_id INTO v_owner_id FROM public.organization_users WHERE organization_id = v_org_id AND role = 'owner' LIMIT 1;
  SELECT user_id INTO v_worker_id FROM public.organization_users WHERE organization_id = v_org_id AND role = 'worker' LIMIT 1;
  IF v_owner_id IS NULL THEN RAISE NOTICE 'Skipping tests: no owner found.'; RETURN; END IF;
  
  -- Setup de RLS test mode para Owner
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_owner_id), true);
  PERFORM set_config('role', 'authenticated', true);

  -- Teste 1: Owner cria draft
  INSERT INTO public.estimate_assistant_drafts (organization_id, created_by, service_type, input, output, status)
  VALUES (v_org_id, v_owner_id, 'painting', '{"test": 1}', '{"out": 2}', 'draft')
  RETURNING id INTO v_draft_id;
  RAISE NOTICE 'Passou: Owner inseriu Draft com sucesso.';

  -- Teste 2: Cross-tenant bloqueado (Owner tentar ler de outra org ou inserir nela)
  IF v_other_org_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.estimate_assistant_drafts (organization_id, created_by, service_type)
      VALUES (v_other_org_id, v_owner_id, 'roofing');
      RAISE EXCEPTION 'FALHA DE SEGURANÇA: Owner conseguiu inserir Draft em outra org!';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'Passou: Owner não acessa outra organization_id para insert.';
      WHEN others THEN
        IF SQLERRM ILIKE '%row-level security%' THEN
          RAISE NOTICE 'Passou: RLS barrou Cross-Tenant (Insert).';
        ELSE
          RAISE;
        END IF;
    END;
  END IF;

  -- Teste 3: Update trigger
  UPDATE public.estimate_assistant_drafts SET status = 'converted' WHERE id = v_draft_id;
  RAISE NOTICE 'Passou: Owner alterou status.';

  -- Teste 4: Worker access
  IF v_worker_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_worker_id), true);
    
    IF (SELECT count(*) FROM public.estimate_assistant_drafts WHERE organization_id = v_org_id) > 0 THEN
      RAISE EXCEPTION 'FALHA DE SEGURANÇA: Worker conseguiu ler Drafts!';
    END IF;
    
    BEGIN
      INSERT INTO public.estimate_assistant_drafts (organization_id, created_by, service_type)
      VALUES (v_org_id, v_worker_id, 'flooring');
      RAISE EXCEPTION 'FALHA DE SEGURANÇA: Worker conseguiu criar Draft!';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'Passou: Worker não consegue inserir Drafts (Insufficient Privilege).';
      WHEN others THEN
        IF SQLERRM ILIKE '%row-level security%' THEN
          RAISE NOTICE 'Passou: RLS barrou Worker (Insert).';
        ELSE
          RAISE;
        END IF;
    END;
  END IF;

  -- Sair de role
  PERFORM set_config('role', 'postgres', true);
  RAISE NOTICE 'Todos os testes de Estimate Assistant Drafts passaram.';

END $$;

-- ============================================================================
-- PASSO 3: ROLLBACK (DESFAZ TUDO APLICADO NO BEGIN)
-- ============================================================================
ROLLBACK;
