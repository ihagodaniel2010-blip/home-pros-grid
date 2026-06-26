-- Diagnóstico Completo do Fluxo de Leads (Somente Leitura)
-- Este script realiza consultas nas tabelas, constraints, policies e funções para verificar o estado real do banco.

-- 1. Constraints da tabela leads
SELECT conname as constraint_name, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.leads'::regclass;

-- 2. Colunas da tabela leads
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;

-- 3. Policies (RLS) da tabela leads
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'leads';

-- 4. Funções existentes
SELECT proname as function_name, proargnames as arguments, prosrc as source_code
FROM pg_proc 
WHERE proname IN ('submit_public_lead', 'get_public_available_leads', 'buy_public_lead', 'generate_public_token');

-- 5. Grants dessas funções
SELECT routine_name, grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name IN ('submit_public_lead', 'get_public_available_leads', 'buy_public_lead', 'generate_public_token');

-- 6. Últimos 10 leads públicos
SELECT id, source, status, organization_id, "fullName", "createdAt"
FROM public.leads 
WHERE source = 'public' 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- 7. Membros das organizações (organization_users)
SELECT id, organization_id, user_id, role, status
FROM public.organization_users 
LIMIT 20;

-- 8. Saldo das empresas (A e B ou geral)
SELECT organization_id, sum(amount) as balance
FROM public.organization_credit_ledger
GROUP BY organization_id;

-- 9. Colunas reais da tabela company_service_areas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'company_service_areas'
ORDER BY ordinal_position;

-- 10. Áreas de atendimento (company_service_areas) - Usando zip e active
SELECT id, organization_id, zip, city, state, active
FROM public.company_service_areas 
LIMIT 20;
