-- SQL de Limpeza do Projeto Supabase Incorreto (dembegkbdvlwkyhftwii / ferreira-saas-v2)
-- Status: MANUAL CLEANUP SCRIPT (DO NOT EXECUTE VIA AGENT - FOR MANUAL RUN ONLY IF DESIRED)

SET search_path = public;

-- 1. Remover função RPC criada por engano no projeto secundário
DROP FUNCTION IF EXISTS public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT);

-- 2. Remover índice criado por engano no projeto secundário
DROP INDEX IF EXISTS public.idx_organization_credit_ledger_ref_type_id;

-- 3. Remover tabelas criadas por engano no projeto secundário (se necessário)
DROP TABLE IF EXISTS public.organization_credit_ledger;
DROP TABLE IF EXISTS public.organizations;

-- ==========================================
-- VERIFICAÇÕES PÓS-LIMPEZA (RODAR DEPOIS DO DROP)
-- ==========================================

-- Verificação 1: Confirmar remoção da função
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'record_stripe_credit_topup';

-- Verificação 2: Confirmar remoção do índice
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname = 'idx_organization_credit_ledger_ref_type_id';
