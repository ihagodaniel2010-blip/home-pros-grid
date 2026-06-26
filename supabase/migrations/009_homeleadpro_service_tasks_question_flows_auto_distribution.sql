-- Proposta para Fase 5.6 - Tasks, Question Flows e Auto-distribuição
-- Este arquivo NÃO DEVE ser aplicado automaticamente. Aguardar revisão e aprovação.

-- 1. service_tasks
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

-- 2. service_question_flows
create table if not exists public.service_question_flows (
    id uuid primary key default gen_random_uuid(),
    category_slug text not null,
    task_slug text,
    step_order integer not null default 1,
    question_key text not null,
    question_text text not null,
    input_type text not null default 'radio', -- radio, select, text
    options jsonb not null default '[]'::jsonb, -- ex: [{"label": "Repair", "value": "repair", "maps_to_task_slug": "flooring-repair", "priority": 1}]
    maps_to_field text,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 3. Atualizar company_services
alter table public.company_services alter column service_category_id drop not null;
alter table public.company_services add column if not exists service_task_id uuid references public.service_tasks(id) on delete cascade;
-- Ajustar constraint única, assumindo que a empresa vincula por task
alter table public.company_services drop constraint if exists company_services_organization_id_service_category_id_key;
alter table public.company_services add constraint company_services_organization_id_service_task_id_key unique (organization_id, service_task_id);

-- 4. Atualizar company_settings
alter table public.company_settings add column if not exists lead_status text not null default 'active'; -- active, paused
alter table public.company_settings add column if not exists paused_until timestamptz;
alter table public.company_settings add column if not exists monthly_lead_budget numeric not null default 500.00;
alter table public.company_settings add column if not exists max_lead_price numeric not null default 50.00;
alter table public.company_settings add column if not exists auto_receive_leads boolean not null default true;

-- 5. Atualizar leads
alter table public.leads add column if not exists service_task_id uuid references public.service_tasks(id) on delete set null;
alter table public.leads add column if not exists client_answers jsonb default '{}'::jsonb;

-- 6. RPC Auto-Distribuição e Submit Lead
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
    
    -- Variáveis para o loop de distribuição
    v_org record;
    v_current_balance numeric;
    v_month_spent numeric;
    v_start_of_month timestamptz := date_trunc('month', now());
begin
    -- 1. Descobrir o ID da task e o preço base se houver task_slug
    if p_task_slug is not null then
        select id, default_lead_price into v_task_id, v_lead_price 
        from public.service_tasks 
        where slug = p_task_slug and active = true 
        limit 1;
    end if;

    -- 2. Inserir o lead
    insert into public.leads (
        source, status, organization_id, "serviceSlug", "selectedServiceOption",
        "locationType", "fullName", email, phone, zip, address, details, subtype,
        service_task_id, client_answers, "createdAt", "updatedAt"
    ) values (
        'public', 'New', v_default_org_id, p_service_slug, p_selected_service_option,
        p_location_type, p_full_name, p_email, p_phone, p_zip, p_address, p_details, p_subtype,
        v_task_id, p_client_answers, v_now, v_now
    )
    returning id into v_lead_id;

    -- 3. Iniciar lógica de Auto-Distribuição
    -- Só distribui se houver uma task identificada (para não enviar lixo genericamente)
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
            -- Para cada org, verificar saldo total e gasto mensal
            v_current_balance := public.get_organization_credit_balance(v_org.organization_id);
            
            select coalesce(sum(abs(amount)), 0) into v_month_spent
            from public.organization_credit_ledger
            where organization_id = v_org.organization_id
              and transaction_type = 'lead_debit'
              and created_at >= v_start_of_month;

            -- Se tem saldo e ainda não estourou o budget mensal
            if v_current_balance >= v_lead_price and (v_month_spent + v_lead_price) <= v_org.monthly_lead_budget then
                -- Comprar o lead automaticamente
                insert into public.lead_distributions (lead_id, organization_id, price_charged, status, charged_at, distributed_at) 
                values (v_lead_id, v_org.organization_id, v_lead_price, 'distributed', v_now, v_now);

                insert into public.organization_credit_ledger (organization_id, amount, transaction_type, reference_type, reference_id, balance_after, description) 
                values (v_org.organization_id, -v_lead_price, 'lead_debit', 'lead_distribution', v_lead_id, v_current_balance - v_lead_price, 'Auto-purchased lead ' || v_lead_id);

                v_distributed_count := v_distributed_count + 1;
            end if;

            -- Limite de 3 empresas
            exit when v_distributed_count >= 3;
        end loop;
    end if;

    return jsonb_build_object(
        'success', true, 
        'lead_id', v_lead_id, 
        'distributed_count', v_distributed_count,
        'reason', case when v_distributed_count = 0 then 'no_matching_companies_or_budget' else 'distributed' end
    );
exception when others then
    -- Se houver falha na inserção, retornar o erro para log (mas a transação fará rollback de tudo no DB)
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.submit_public_lead(text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, text, jsonb) to anon;
grant execute on function public.submit_public_lead(text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, text, jsonb) to authenticated;

-- RLS
alter table public.service_tasks enable row level security;
alter table public.service_question_flows enable row level security;

create policy "Public can read active service tasks" on public.service_tasks for select using (active = true);
create policy "Super admin can manage service tasks" on public.service_tasks for all using (public.is_super_admin());

create policy "Public can read active question flows" on public.service_question_flows for select using (active = true);
create policy "Super admin can manage question flows" on public.service_question_flows for all using (public.is_super_admin());
