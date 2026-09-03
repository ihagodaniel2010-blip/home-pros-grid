-- SQL de Limpeza Final do Projeto Supabase Incorreto (dembegkbdvlwkyhftwii / ferreira-saas-v2)
-- Status: MANUAL CLEANUP SCRIPT (FOR MANUAL RUN ONLY BY USER - NO CASCADE DROPS)

SET search_path = public;

-- ==========================================
-- 1. PRE-CHECK: Confirmar Contagem das Tabelas
-- ==========================================
SELECT 
  (SELECT COUNT(*) FROM public.organizations) AS total_organizations,
  (SELECT COUNT(*) FROM public.organization_credit_ledger) AS total_credit_ledger;

-- ==========================================
-- 2. REMOVER FUNÇÃO E ÍNDICE CRIADOS POR ENGANO
-- ==========================================
DROP FUNCTION IF EXISTS public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT);
DROP INDEX IF EXISTS public.idx_organization_credit_ledger_ref_type_id;

-- ==========================================
-- 3. REMOVER TABELAS CRIADAS POR ENGANO SOMENTE SE ESTIVEREM VAZIAS (COUNT = 0 - SEM CASCADE)
-- ==========================================
DO $$
DECLARE
    v_ledger_count INT := 0;
    v_org_count INT := 0;
BEGIN
    -- Check organization_credit_ledger row count
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_credit_ledger') THEN
        EXECUTE 'SELECT COUNT(*) FROM public.organization_credit_ledger' INTO v_ledger_count;
        IF v_ledger_count = 0 THEN
            EXECUTE 'DROP TABLE public.organization_credit_ledger';
            RAISE NOTICE 'Tabela public.organization_credit_ledger vazia (0 linhas) removida com sucesso.';
        ELSE
            RAISE EXCEPTION 'ABORTADO: public.organization_credit_ledger contem % linhas. Tabela NAO removida!', v_ledger_count;
        END IF;
    END IF;

    -- Check organizations row count
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        EXECUTE 'SELECT COUNT(*) FROM public.organizations' INTO v_org_count;
        IF v_org_count = 0 THEN
            EXECUTE 'DROP TABLE public.organizations';
            RAISE NOTICE 'Tabela public.organizations vazia (0 linhas) removida com sucesso.';
        ELSE
            RAISE EXCEPTION 'ABORTADO: public.organizations contem % linhas. Tabela NAO removida!', v_org_count;
        END IF;
    END IF;
END;
$$;

-- ==========================================
-- 4. VERIFICAÇÕES FINAIS PÓS-LIMPEZA
-- ==========================================

-- Verificação 1: Confirmar remoção da função (deve retornar resultado vazio)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'record_stripe_credit_topup';

-- Verificação 2: Confirmar remoção do índice (deve retornar resultado vazio)
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname = 'idx_organization_credit_ledger_ref_type_id';

-- Verificação 3: Confirmar remoção das tabelas (deve retornar resultado vazio)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organization_credit_ledger', 'organizations');
