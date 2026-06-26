-- 004_homeleadpro_seed_test_data.sql
-- Seed de Dados de Teste Controlado para HomeLeadPro SaaS Multiempresa (Idempotente).
--
-- 🛡️ IMPORTANTE: Este script NÃO cria usuários fictícios na tabela auth.users.
-- Os usuários devem ser criados manualmente pelo painel do Supabase Auth para garantir
-- o correto registro no GoTrue (tabelas auth.identities, metadados e senhas).
--
-- 🚀 INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o dashboard do Supabase (Authentication -> Users -> Add User).
-- 2. Crie os 5 usuários listados abaixo.
-- 3. Copie os UUIDs gerados para cada um deles.
-- 4. Substitua os valores das variáveis na seção DECLARE abaixo pelos UUIDs reais gerados.
-- 5. Execute este script no SQL Editor envelopado em BEGIN; ... ROLLBACK; para testar.
-- 6. Se tudo estiver correto, execute com BEGIN; ... COMMIT;

do $$
declare
    -- =========================================================================
    -- ⚠️ ATENÇÃO: SUBSTITUA OS UUIDs ABAIXO PELOS GERADOS NO SUPABASE AUTH
    -- =========================================================================
    v_user_admin_global    uuid := '11111111-1111-1111-1111-111111111111'::uuid; -- admin-global@homeleadpro.com
    v_user_owner_a         uuid := '22222222-2222-2222-2222-222222222222'::uuid; -- owner-a@homeleadpro.com
    v_user_owner_b         uuid := '33333333-3333-3333-3333-333333333333'::uuid; -- owner-b@homeleadpro.com
    v_user_admin_a         uuid := '44444444-4444-4444-4444-444444444444'::uuid; -- admin-a@homeleadpro.com
    v_user_worker_a        uuid := '55555555-5555-5555-5555-555555555555'::uuid; -- worker-a@homeleadpro.com

    -- =========================================================================
    -- UUIDs Fixos Usados para os demais Registros de Teste (Não alterar)
    -- =========================================================================
    v_org_platform         uuid := '45689bbf-193b-4ae8-82f4-e32bbe63b6dd'::uuid; -- NEXT_PUBLIC_DEFAULT_ORG_ID
    v_org_a                uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_org_b                uuid := 'b0000000-0000-0000-0000-000000000002'::uuid;

    v_cat_roofing          uuid := 'c0000000-0000-0000-0000-000000000001'::uuid;
    v_cat_painting         uuid := 'c0000000-0000-0000-0000-000000000002'::uuid;
    v_cat_plumbing         uuid := 'c0000000-0000-0000-0000-000000000003'::uuid;
    v_cat_carpentry        uuid := 'c0000000-0000-0000-0000-000000000004'::uuid;

    v_lead_public          uuid := 'd0000000-0000-0000-0000-000000000001'::uuid;
    v_lead_manual_a        uuid := 'd0000000-0000-0000-0000-000000000002'::uuid;

    v_estimate_a           uuid := 'e0000000-0000-0000-0000-000000000001'::uuid;
    v_job_a                uuid := 'f0000000-0000-0000-0000-000000000001'::uuid;
    v_checklist_a          uuid := 'f0000000-0000-0000-0000-000000000002'::uuid;
    v_extra_a              uuid := 'f0000000-0000-0000-0000-000000000003'::uuid;

    v_ledger_id_a          uuid := '80000000-0000-0000-0000-000000000001'::uuid;
    v_ledger_id_b          uuid := '80000000-0000-0000-0000-000000000002'::uuid;
    v_ledger_id_charge     uuid := '80000000-0000-0000-0000-000000000003'::uuid;
begin
    -- 🛡️ Validação Prévia de Integridade e Dependências
    if not exists (select 1 from auth.users where id = v_user_admin_global) or
       not exists (select 1 from auth.users where id = v_user_owner_a) or
       not exists (select 1 from auth.users where id = v_user_owner_b) or
       not exists (select 1 from auth.users where id = v_user_admin_a) or
       not exists (select 1 from auth.users where id = v_user_worker_a) then
        raise exception 'Erro de Dependência: Um ou mais UUIDs dos usuários de teste não foram encontrados em auth.users. Crie os usuários manualmente no painel Supabase Auth primeiro e atualize as variáveis UUID no início deste script.';
    end if;

    ----------------------------------------------------------------------------
    -- 1. Organizations
    ----------------------------------------------------------------------------
    insert into public.organizations (id, name, slug, status, is_platform_owner)
    values 
      (v_org_platform, 'HomePros Platform Owner', 'homepros-platform', 'active', true),
      (v_org_a, 'HomePros Empresa A', 'homepros-empresa-a', 'active', false),
      (v_org_b, 'HomePros Empresa B', 'homepros-empresa-b', 'active', false)
    on conflict (id) do nothing;

    ----------------------------------------------------------------------------
    -- 2. Organization Users (Vínculos Multiempresa)
    ----------------------------------------------------------------------------
    insert into public.organization_users (organization_id, user_id, role, status)
    values
      (v_org_platform, v_user_admin_global, 'super_admin', 'active'),
      (v_org_a, v_user_owner_a, 'owner', 'active'),
      (v_org_b, v_user_owner_b, 'owner', 'active'),
      (v_org_a, v_user_admin_a, 'admin', 'active'),
      (v_org_a, v_user_worker_a, 'worker', 'active')
    on conflict (organization_id, user_id) do nothing;

    ----------------------------------------------------------------------------
    -- 3. Company Settings
    ----------------------------------------------------------------------------
    insert into public.company_settings (organization_id, company_name, phone, email, website, address, city, state, zip)
    values
      (v_org_a, 'HomePros Empresa A Inc.', '555-111-2222', 'contato@empresa-a.com', 'www.empresa-a.com', '123 Main St', 'New York', 'NY', '12345'),
      (v_org_b, 'HomePros Empresa B Corp.', '555-333-4444', 'contato@empresa-b.com', 'www.empresa-b.com', '456 Oak Ave', 'Los Angeles', 'CA', '54321')
    on conflict (organization_id) do nothing;

    ----------------------------------------------------------------------------
    -- 4. Service Categories
    ----------------------------------------------------------------------------
    insert into public.service_categories (id, name, slug, active)
    values
      (v_cat_roofing, 'Coberturas / Roofing', 'roofing', true),
      (v_cat_painting, 'Pintura / Painting', 'painting', true),
      (v_cat_plumbing, 'Encanamento / Plumbing', 'plumbing', true),
      (v_cat_carpentry, 'Carpintaria / Carpentry', 'carpentry', true)
    on conflict (id) do nothing;

    ----------------------------------------------------------------------------
    -- 5. Company Services (Vínculo de empresas com categorias)
    ----------------------------------------------------------------------------
    insert into public.company_services (organization_id, service_category_id, active)
    values
      (v_org_a, v_cat_roofing, true),
      (v_org_a, v_cat_painting, true),
      (v_org_b, v_cat_plumbing, true),
      (v_org_b, v_cat_carpentry, true)
    on conflict (organization_id, service_category_id) do nothing;

    ----------------------------------------------------------------------------
    -- 6. Company Service Areas (Cobertura geográfica)
    ----------------------------------------------------------------------------
    -- Empresa A cobre por raio ao redor do ZIP 12345
    -- Empresa B cobre por lista específica do ZIP 54321
    if not exists (select 1 from public.company_service_areas where organization_id in (v_org_a, v_org_b)) then
        insert into public.company_service_areas (organization_id, mode, zip, radius_miles, active)
        values
          (v_org_a, 'radius', '12345', 25.0, true),
          (v_org_b, 'zip_list', '54321', null, true);
    end if;

    ----------------------------------------------------------------------------
    -- 7. Lead Pricing Rules
    ----------------------------------------------------------------------------
    if not exists (select 1 from public.lead_pricing_rules where service_category_id in (v_cat_roofing, v_cat_plumbing)) then
        insert into public.lead_pricing_rules (service_category_id, size_class, base_price, active)
        values
          (v_cat_roofing, 'small', 30.00, true),
          (v_cat_plumbing, 'small', 25.00, true);
    end if;

    ----------------------------------------------------------------------------
    -- 8. Platform Settings
    ----------------------------------------------------------------------------
    insert into public.platform_settings (key, value, description)
    values
      ('lead_distribution_settings', '{"max_distributions": 3}'::jsonb, 'Configuração global de limite de distribuição de leads públicos')
    on conflict (key) do nothing;

    ----------------------------------------------------------------------------
    -- 9. Organization Credit Ledger (Crédito financeiro para compra de leads)
    ----------------------------------------------------------------------------
    -- Empresa A começa com saldo alto de $100.00
    -- Empresa B começa com saldo baixo de $5.00 (para forçar erro de saldo insuficiente)
    insert into public.organization_credit_ledger (id, organization_id, amount, transaction_type, balance_after, description)
    values
      (v_ledger_id_a, v_org_a, 100.00, 'credit_added', 100.00, 'Carga de crédito inicial de teste para Empresa A'),
      (v_ledger_id_b, v_org_b, 5.00, 'credit_added', 5.00, 'Carga de crédito inicial baixa para Empresa B')
    on conflict (id) do nothing;

    ----------------------------------------------------------------------------
    -- 10. Leads
    ----------------------------------------------------------------------------
    -- 1 lead público global (Roofing, ZIP 12345)
    -- 1 lead manual criado direto dentro do tenant da Empresa A (Roofing)
    insert into public.leads (id, organization_id, source, full_name, email, phone, zip, selected_service, service_category_id, urgency, status, public_token)
    values
      (v_lead_public, null, 'public', 'Cliente Público', 'publico@email.com', '555-999-0000', '12345', 'Roofing Installation', v_cat_roofing, 'standard', 'new', 'test-lead-public-token-111'),
      (v_lead_manual_a, v_org_a, 'manual', 'Cliente Manual A', 'manual-a@email.com', '555-888-9999', '12345', 'Roofing Repair', v_cat_roofing, 'standard', 'new', 'test-lead-manual-token-222')
    on conflict (id) do nothing;

    ----------------------------------------------------------------------------
    -- 11. Lead Distributions (Distribuição de leads globais)
    ----------------------------------------------------------------------------
    -- O lead público global é comprado pela Empresa A (custo de $30.00)
    insert into public.lead_distributions (lead_id, organization_id, price_charged, status)
    values
      (v_lead_public, v_org_a, 30.00, 'distributed')
    on conflict (lead_id, organization_id) do nothing;

    -- Deduzir os $30.00 do saldo do ledger da Empresa A
    insert into public.organization_credit_ledger (id, organization_id, amount, transaction_type, reference_type, reference_id, balance_after, description)
    values
      (v_ledger_id_charge, v_org_a, -30.00, 'lead_debit', 'lead_distribution', v_lead_public, 70.00, 'Débito por lead distribuído de teste')
    on conflict (id) do nothing;

    ----------------------------------------------------------------------------
    -- 12. Estimates & Estimate Items
    ----------------------------------------------------------------------------
    -- 1 orçamento de rascunho vinculado ao lead manual da Empresa A
    insert into public.estimates (id, organization_id, lead_id, client_name, client_email, client_phone, client_zip, status, total_amount, subtotal, tax_rate, tax_amount, balance_due, payment_status, public_token)
    values
      (v_estimate_a, v_org_a, v_lead_manual_a, 'Cliente Manual A', 'manual-a@email.com', '555-888-9999', '12345', 'draft', 100.00, 100.00, 0, 0, 100.00, 'unpaid', 'test-estimate-token-a123')
    on conflict (id) do nothing;

    -- Inserir os itens de orçamento. O trigger recalculará os totais do pai
    if not exists (select 1 from public.estimate_items where estimate_id = v_estimate_a) then
        insert into public.estimate_items (estimate_id, organization_id, description, quantity, unit_price, total_price, sort_order)
        values
          (v_estimate_a, v_org_a, 'Serviço de instalação de telhas básicas', 2.0, 50.00, 100.00, 1),
          (v_estimate_a, v_org_a, 'Materiais de fixação e impermeabilização', 1.0, 0.00, 0.00, 2);
    end if;

    ----------------------------------------------------------------------------
    -- 13. Service Jobs (Ordem de Serviço atribuída a Worker A)
    ----------------------------------------------------------------------------
    insert into public.service_jobs (id, organization_id, lead_id, estimate_id, status, assigned_worker_id, address_released_to_worker)
    values
      (v_job_a, v_org_a, v_lead_manual_a, v_estimate_a, 'scheduled', v_user_worker_a, true)
    on conflict (id) do nothing;

    ----------------------------------------------------------------------------
    -- 14. Service Checklists & Checklist Tasks
    ----------------------------------------------------------------------------
    insert into public.service_checklists (id, organization_id, service_job_id, title, created_by)
    values
      (v_checklist_a, v_org_a, v_job_a, 'Checklist de Preparação de Cobertura', v_user_owner_a)
    on conflict (id) do nothing;

    if not exists (select 1 from public.checklist_tasks where checklist_id = v_checklist_a) then
        insert into public.checklist_tasks (organization_id, checklist_id, description, is_completed, sort_order)
        values
          (v_org_a, v_checklist_a, 'Remover telhas quebradas antigas', false, 1),
          (v_org_a, v_checklist_a, 'Limpar a superfície de poeira e detritos', false, 2);
    end if;

    ----------------------------------------------------------------------------
    -- 15. Service Extras (Solicitações financeiras adicionais ao cliente)
    ----------------------------------------------------------------------------
    insert into public.service_extras (id, organization_id, service_job_id, estimate_id, description, amount, status, public_token)
    values
      (v_extra_a, v_org_a, v_job_a, v_estimate_a, 'Taxa adicional por remoção de resíduos especiais', 45.00, 'pending', 'test-extra-token-e123')
    on conflict (id) do nothing;

    ----------------------------------------------------------------------------
    -- 16. Service Files (Fotos do serviço registradas pelo funcionário)
    ----------------------------------------------------------------------------
    if not exists (select 1 from public.service_files where service_job_id = v_job_a) then
        insert into public.service_files (organization_id, lead_id, estimate_id, service_job_id, storage_path, file_url, file_type, mime_type, file_size, title, visibility, uploaded_by)
        values
          (v_org_a, v_lead_manual_a, v_estimate_a, v_job_a, 'jobs/job_a/foto_inicial.jpg', 'https://example.com/foto_inicial.jpg', 'image', 'image/jpeg', 204800, 'Foto Inicial do Telhado', 'internal', v_user_worker_a);
    end if;

    ----------------------------------------------------------------------------
    -- 17. Reviews (Depoimentos públicos e filas de moderação)
    ----------------------------------------------------------------------------
    if not exists (select 1 from public.reviews where organization_id = v_org_a) then
        insert into public.reviews (organization_id, user_name, rating, body, public_approved, is_hidden)
        values
          (v_org_a, 'João Silva', 5, 'Excelente serviço de reforma de telhado! Equipe muito profissional e pontual.', true, false),
          (v_org_a, 'Maria Souza', 4, 'Trabalho muito bom, mas atrasaram um pouco a entrega dos materiais.', false, false);
    end if;

    raise notice 'Seed de dados de teste executado com sucesso!';
end $$;
