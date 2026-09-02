-- Migration 019: Proposta de Limpeza de Dados de Teste de QA (NÃO APLICADA)
-- Apenas executável mediante autorização prévia do usuário.

-- 1. Deletar despesas de teste
DELETE FROM public.expenses 
WHERE vendor = 'QA Test Vendor' OR notes LIKE '%QA test%';

-- 2. Deletar pagamentos de clientes de teste
DELETE FROM public.client_payments 
WHERE notes = 'QA test payment' OR customer_name LIKE '%QA Test%';

-- 3. Deletar pagamentos manuais de orçamentos de teste
DELETE FROM public.estimate_payments 
WHERE notes = 'QA test payment';

-- 4. Deletar trabalhos de teste
DELETE FROM public.service_jobs 
WHERE title LIKE '%QA Test Customer%';

-- 5. Deletar itens de orçamentos de teste
DELETE FROM public.estimate_items 
WHERE description IN ('Roof Flashing Repair', 'Shingle Inspection & Sealant');

-- 6. Deletar orçamentos de teste
DELETE FROM public.estimates 
WHERE client_email IN ('qa-test@example.com', 'qa-remodel@example.com') OR client_name LIKE '%QA Test%';

-- 7. Deletar distribuições de leads de teste
DELETE FROM public.lead_distributions 
WHERE lead_id IN (
    SELECT id FROM public.leads WHERE email IN ('qa-test@example.com', 'qa-remodel@example.com')
);

-- 8. Deletar leads de teste
DELETE FROM public.leads 
WHERE email IN ('qa-test@example.com', 'qa-remodel@example.com') OR full_name LIKE '%QA Test%';

-- 9. Deletar créditos de teste no ledger (opcional)
DELETE FROM public.organization_credit_ledger 
WHERE description LIKE '%Manual credit added by admin%' AND amount = 100;
