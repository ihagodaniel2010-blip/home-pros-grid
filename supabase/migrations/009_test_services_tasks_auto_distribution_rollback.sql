-- Teste ROLLBACK: Auto-Distribuição de Leads com novo fluxo (Fase 5.6)
-- Este script aplica temporariamente a estrutura e simula a distribuição.

begin;

-- 1. Aplicar estrutura do 009 (Schema)
create table if not exists public.service_tasks (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.service_categories(id) on delete cascade,
    slug text not null unique,
    name text not null,
    min_lead_price numeric not null default 15.00,
    max_lead_price numeric not null default 150.00,
    default_lead_price numeric not null default 30.00,
    for_business boolean not null default false,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.company_services alter column service_category_id drop not null;
alter table public.company_services add column if not exists service_task_id uuid references public.service_tasks(id) on delete cascade;
alter table public.company_services drop constraint if exists company_services_organization_id_service_category_id_key;
alter table public.company_services drop constraint if exists company_services_organization_id_service_task_id_key;
alter table public.company_services add constraint company_services_organization_id_service_task_id_key unique (organization_id, service_task_id);

alter table public.company_settings add column if not exists lead_status text not null default 'active';
alter table public.company_settings add column if not exists paused_until timestamptz;
alter table public.company_settings add column if not exists monthly_lead_budget numeric not null default 500.00;
alter table public.company_settings add column if not exists max_lead_price numeric not null default 50.00;
alter table public.company_settings add column if not exists auto_receive_leads boolean not null default true;

alter table public.leads add column if not exists service_task_id uuid references public.service_tasks(id) on delete set null;
alter table public.leads add column if not exists client_answers jsonb default '{}'::jsonb;

-- Recriar RPC submit_public_lead
create or replace function public.submit_public_lead(
    p_service_slug text, p_selected_service_option text, p_location_type text,
    p_full_name text, p_email text, p_phone text, p_zip text, p_address text,
    p_details text default null, p_subtype text default null,
    p_media_urls jsonb default null, p_selected_pros jsonb default null,
    p_task_slug text default null, p_client_answers jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
    v_lead_id uuid;
    v_now timestamptz := now();
    v_default_org_id uuid := '45689bbf-193b-4ae8-82f4-e32bbe63b6dd'::uuid;
    v_task_id uuid := null;
    v_lead_price numeric := 30.00;
    v_distributed_count integer := 0;
    v_org record;
    v_current_balance numeric;
    v_month_spent numeric;
    v_start_of_month timestamptz := date_trunc('month', now());
begin
    if p_task_slug is not null then
        select id, default_lead_price into v_task_id, v_lead_price 
        from public.service_tasks 
        where slug = p_task_slug and active = true 
        limit 1;
    end if;

    insert into public.leads (
        source, status, organization_id, "serviceSlug", "selectedServiceOption",
        "locationType", "fullName", email, phone, zip, address, details, subtype,
        service_task_id, client_answers, "createdAt", "updatedAt"
    ) values (
        'public', 'New', v_default_org_id, p_service_slug, p_selected_service_option,
        p_location_type, p_full_name, p_email, p_phone, p_zip, p_address, p_details, p_subtype,
        v_task_id, p_client_answers, v_now, v_now
    ) returning id into v_lead_id;

    if v_task_id is not null then
        for v_org in (
            select cs.organization_id, setg.monthly_lead_budget, setg.max_lead_price
            from public.company_services cs
            join public.company_service_areas csa on csa.organization_id = cs.organization_id
            join public.company_settings setg on setg.organization_id = cs.organization_id
            where cs.service_task_id = v_task_id 
              and cs.organization_id != v_default_org_id
              and cs.active = true
              and csa.zip = p_zip 
              and csa.active = true
              and setg.auto_receive_leads = true
              and setg.lead_status = 'active'
              and (setg.paused_until is null or setg.paused_until < v_now)
              and setg.max_lead_price >= v_lead_price
        ) loop
            v_current_balance := public.get_organization_credit_balance(v_org.organization_id);
            select coalesce(sum(abs(amount)), 0) into v_month_spent
            from public.organization_credit_ledger
            where organization_id = v_org.organization_id and transaction_type = 'lead_debit' and created_at >= v_start_of_month;

            if v_current_balance >= v_lead_price and (v_month_spent + v_lead_price) <= v_org.monthly_lead_budget then
                insert into public.lead_distributions (lead_id, organization_id, price_charged, status, charged_at, distributed_at) 
                values (v_lead_id, v_org.organization_id, v_lead_price, 'distributed', v_now, v_now);
                insert into public.organization_credit_ledger (organization_id, amount, transaction_type, reference_type, reference_id, balance_after, description) 
                values (v_org.organization_id, -v_lead_price, 'lead_debit', 'lead_distribution', v_lead_id, v_current_balance - v_lead_price, 'Auto-purchased lead');
                v_distributed_count := v_distributed_count + 1;
            end if;
            exit when v_distributed_count >= 3;
        end loop;
    end if;

    return jsonb_build_object('success', true, 'lead_id', v_lead_id, 'distributed_count', v_distributed_count);
end;
$$;

do $$
declare
    v_cat_id uuid;
    v_task_id uuid;
    v_org_a uuid := gen_random_uuid();
    v_org_b uuid := gen_random_uuid();
    v_result jsonb;
    v_dist_count int;
    v_lead_id uuid;
begin
    -- 2. Seed mínimo para o teste
    insert into public.service_categories (id, name, slug, active) values (gen_random_uuid(), 'Test Cat', 'test-cat', true) returning id into v_cat_id;
    insert into public.service_tasks (category_id, slug, name, default_lead_price) values (v_cat_id, 'test-task', 'Test Task', 30.00) returning id into v_task_id;

    -- 3. Configurar Empresa A (Compatível)
    insert into public.organizations (id, name, slug, status) values (v_org_a, 'Empresa A Teste', 'empresa-a-teste-rollback', 'active');
    insert into public.company_settings (organization_id, company_name, phone, email, address, license_number, insurance_info, default_tax_rate, default_terms, auto_receive_leads, lead_status, monthly_lead_budget, max_lead_price)
    values (v_org_a, 'Empresa A Teste', '111', 'a@test.com', 'Rua A', '1', '1', 0, '1', true, 'active', 100.00, 50.00);
    insert into public.company_service_areas (organization_id, mode, zip, city, state, active) values (v_org_a, 'zip_list', '04064', 'Boston', 'MA', true);
    insert into public.company_services (organization_id, service_task_id, active) values (v_org_a, v_task_id, true);
    insert into public.organization_credit_ledger (organization_id, amount, transaction_type, balance_after, description) values (v_org_a, 1000.00, 'credit_added', 1000.00, 'Initial Deposit');

    -- 4. Configurar Empresa B (Incompatível - sem zip)
    insert into public.organizations (id, name, slug, status) values (v_org_b, 'Empresa B Teste', 'empresa-b-teste-rollback', 'active');
    insert into public.company_settings (organization_id, company_name, phone, email, address, license_number, insurance_info, default_tax_rate, default_terms, auto_receive_leads, lead_status, monthly_lead_budget, max_lead_price)
    values (v_org_b, 'Empresa B Teste', '222', 'b@test.com', 'Rua B', '1', '1', 0, '1', true, 'active', 100.00, 50.00);
    insert into public.company_service_areas (organization_id, mode, zip, city, state, active) values (v_org_b, 'zip_list', '99999', 'Other', 'OT', true);
    insert into public.company_services (organization_id, service_task_id, active) values (v_org_b, v_task_id, true);
    insert into public.organization_credit_ledger (organization_id, amount, transaction_type, balance_after, description) values (v_org_b, 1000.00, 'credit_added', 1000.00, 'Initial Deposit');

    -- 5. Executar RPC
    v_result := public.submit_public_lead(
        'test-cat', 'Option', 'Residential', 'John Doe', 'john@test.com', '12345678', '04064', '123 Test St',
        'Details', 'Subtype', null, null, 'test-task', '{"color":"blue"}'::jsonb
    );

    -- 6. Validações
    raise notice 'RPC Result: %', v_result;
    
    if not (v_result->>'success')::boolean then
        raise exception 'RPC failed!';
    end if;

    v_dist_count := (v_result->>'distributed_count')::int;
    if v_dist_count != 1 then
        raise exception 'Expected distributed_count = 1, got %', v_dist_count;
    end if;

    v_lead_id := (v_result->>'lead_id')::uuid;

    -- Verificar se Empresa A recebeu
    if not exists (select 1 from public.lead_distributions where lead_id = v_lead_id and organization_id = v_org_a) then
        raise exception 'Empresa A nao recebeu o lead';
    end if;

    -- Verificar debito Empresa A
    if not exists (select 1 from public.organization_credit_ledger where organization_id = v_org_a and transaction_type = 'lead_debit' and reference_id = v_lead_id) then
        raise exception 'Empresa A nao foi debitada';
    end if;

    -- Verificar que Empresa B nao recebeu
    if exists (select 1 from public.lead_distributions where lead_id = v_lead_id and organization_id = v_org_b) then
        raise exception 'Empresa B recebeu o lead indevidamente';
    end if;

    raise notice '==================================================';
    raise notice 'TESTE DE AUTO-DISTRIBUICAO PASSOU COM SUCESSO!';
    raise notice '==================================================';
end;
$$;

rollback;
