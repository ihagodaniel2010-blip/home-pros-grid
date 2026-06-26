-- 005b_homeleadpro_worker_rls_restriction_proposal.sql
--
-- PROPOSTA DE RESTRIÇÃO ADICIONAL DE RLS PARA ROLE WORKER
-- NÃO APLICAR SEM APROVAÇÃO
--
-- Contexto:
-- Atualmente, o worker pode ler todos os leads da sua organização via RLS.
-- O banco não restringe a leitura de leads somente aos leads vinculados
-- a service_jobs atribuídos ao worker.
--
-- PROBLEMA:
-- A policy atual permite que workers leiam TODOS os leads da organização,
-- o que é mais permissivo do que o necessário.
--
-- PROPOSTA:
-- Adicionar policies mais restritivas para workers nas tabelas:
-- - leads
-- - estimates
-- - estimate_items
-- - estimate_payments
-- - organization_credit_ledger
-- - lead_distributions
--
-- NOTA IMPORTANTE:
-- Antes de aplicar, verificar as policies existentes com:
--
--   select policyname, tablename, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;
--
-- Para não duplicar ou conflitar com policies já existentes.

--------------------------------------------------------------------------------
-- 1. LEADS: Worker vê apenas leads vinculados a seus service_jobs
--------------------------------------------------------------------------------

-- Drop policy permissiva existente se necessário (verificar nome exato antes):
-- drop policy if exists "Company members can view leads" on public.leads;

-- Nova policy para worker:
create policy "Workers can only view leads from their assigned jobs"
  on public.leads
  for select
  using (
    -- Verificar se o usuário é worker desta org
    public.get_user_role_in_org(organization_id) = 'worker'
    and
    -- Verificar se existe um job atribuído a ele vinculado a este lead
    exists (
      select 1 from public.service_jobs
      where service_jobs.lead_id = leads.id
      and service_jobs.assigned_worker_id = auth.uid()
    )
  );

--------------------------------------------------------------------------------
-- 2. ESTIMATES: Worker NÃO deve ver estimates
--------------------------------------------------------------------------------

-- Proposta: garantir que workers não tenham select em estimates
-- (se a policy atual der acesso a todos da org, revogar para worker)

-- drop policy if exists "Company members can view estimates" on public.estimates;

-- Nova policy: workers explicitamente excluídos de selects em estimates
-- (assumindo que uma policy para owner/admin já existe com check de role)
-- Verificar antes de aplicar.

--------------------------------------------------------------------------------
-- 3. TABELAS FINANCEIRAS: Bloquear explicitamente para workers
-- - organization_credit_ledger
-- - estimate_payments
-- - lead_distributions (exceto verificar se lead foi distribuído ao seu job)
--------------------------------------------------------------------------------

-- organization_credit_ledger: worker NÃO deve ver
-- drop policy if exists "Company members can view ledger" on public.organization_credit_ledger;
-- create policy "Only owners and admins can view credit ledger"
--   on public.organization_credit_ledger
--   for select
--   using (public.get_user_role_in_org(organization_id) in ('owner', 'admin', 'super_admin'));

--------------------------------------------------------------------------------
-- 4. INSTRUÇÕES PARA APLICAÇÃO:
--------------------------------------------------------------------------------
-- 1. Execute este script em modo ROLLBACK no SQL Editor do Supabase primeiro.
-- 2. Verifique os logs de erro para ajustar nomes de policies existentes.
-- 3. Só faça COMMIT após aprovação.
-- 4. Após aplicar, teste com worker-a@homeleadpro.com:
--    - Deve conseguir ver apenas os leads dos jobs atribuídos.
--    - NÃO deve conseguir ver o lead manual_a se não houver job atribuído.
--    - NÃO deve acessar estimates, ledger, ou distribuições de crédito.
