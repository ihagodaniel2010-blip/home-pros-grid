-- 010_homeleadpro_fase5_6_2_fixes.sql

-- 1. get_my_organization_leads()
create or replace function public.get_my_organization_leads()
returns setof public.leads
language plpgsql security definer set search_path = public, extensions as $$
declare
    v_user_id uuid := auth.uid();
    v_org_id uuid;
begin
    -- 1. Descobrir a organização ativa do usuário
    select organization_id into v_org_id
    from public.organization_users
    where user_id = v_user_id and status = 'active'
    limit 1;

    if v_org_id is null then
        return;
    end if;

    -- 2. Retornar os leads manuais ou os distribuídos
    return query
    select l.*
    from public.leads l
    where l.organization_id = v_org_id
       or l.id in (
           select ld.lead_id
           from public.lead_distributions ld
           where ld.organization_id = v_org_id
       )
    order by l."createdAt" desc;
end;
$$;

grant execute on function public.get_my_organization_leads() to authenticated;


-- 2. Atualizar submit_public_lead para suportar skipped_reasons
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
    
    v_skipped_reasons jsonb := '[]'::jsonb;
    v_reason text;
begin
    -- 1. Descobrir o ID da task e preço base
    if p_task_slug is not null and p_task_slug != 'needs_review' then
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
    if v_task_id is not null then
        -- Vamos iterar sobre todas as orgs que possuem a service_task_id configurada para registrar por que falharam.
        for v_org in (
            select cs.organization_id, setg.monthly_lead_budget, setg.max_lead_price,
                   setg.auto_receive_leads, setg.lead_status, setg.paused_until,
                   coalesce((select csa.active from public.company_service_areas csa where csa.organization_id = cs.organization_id and csa.zip = p_zip limit 1), false) as zip_active
            from public.company_services cs
            join public.company_settings setg on setg.organization_id = cs.organization_id
            where cs.service_task_id = v_task_id 
              and cs.organization_id != v_default_org_id
              and cs.active = true
        ) loop
            v_reason := null;
            
            -- Checagens
            if not v_org.zip_active then
                v_reason := 'no_zip_match';
            elsif not v_org.auto_receive_leads then
                v_reason := 'auto_receive_off';
            elsif v_org.lead_status != 'active' then
                v_reason := 'paused';
            elsif v_org.paused_until is not null and v_org.paused_until >= v_now then
                v_reason := 'paused';
            elsif v_org.max_lead_price < v_lead_price then
                v_reason := 'max_price_too_low';
            else
                -- Checar saldos
                v_current_balance := public.get_organization_credit_balance(v_org.organization_id);
                
                select coalesce(sum(abs(amount)), 0) into v_month_spent
                from public.organization_credit_ledger
                where organization_id = v_org.organization_id
                  and transaction_type = 'lead_debit'
                  and created_at >= v_start_of_month;
                  
                if (v_month_spent + v_lead_price) > v_org.monthly_lead_budget then
                    v_reason := 'budget_exceeded';
                elsif v_current_balance < v_lead_price then
                    v_reason := 'insufficient_balance';
                end if;
            end if;

            if v_reason is null then
                -- Comprar o lead
                insert into public.lead_distributions (lead_id, organization_id, price_charged, status, charged_at, distributed_at) 
                values (v_lead_id, v_org.organization_id, v_lead_price, 'distributed', v_now, v_now);

                insert into public.organization_credit_ledger (organization_id, amount, transaction_type, reference_type, reference_id, balance_after, description) 
                values (v_org.organization_id, -v_lead_price, 'lead_debit', 'lead_distribution', v_lead_id, v_current_balance - v_lead_price, 'Auto-purchased lead ' || v_lead_id);

                v_distributed_count := v_distributed_count + 1;
            else
                v_skipped_reasons := v_skipped_reasons || jsonb_build_object('organization_id', v_org.organization_id, 'reason', v_reason);
            end if;

            exit when v_distributed_count >= 3;
        end loop;
    end if;

    return jsonb_build_object(
        'success', true, 
        'lead_id', v_lead_id, 
        'task_slug', p_task_slug,
        'task_id', v_task_id,
        'lead_price', v_lead_price,
        'distributed_count', v_distributed_count,
        'skipped_reasons', v_skipped_reasons
    );
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.submit_public_lead(text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, text, jsonb) to anon;
grant execute on function public.submit_public_lead(text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, text, jsonb) to authenticated;

-- 3. Atualizar get_public_available_leads para filtrar por ZIP e Task
-- O DROP é necessário porque a nova versão altera o tipo de retorno da função.
drop function if exists public.get_public_available_leads();

-- Se existir alguma assinatura com parâmetros, detectar e dropar também
DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc
        WHERE proname = 'get_public_available_leads'
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

create or replace function public.get_public_available_leads()
returns table (
    id uuid,
    created_at timestamptz,
    service_slug text,
    zip_code text,
    city text,
    state text,
    details text,
    urgency text,
    base_price numeric
)
language plpgsql security definer set search_path = public, extensions as $$
declare
    v_user_id uuid := auth.uid();
    v_org_id uuid;
begin
    -- 1. Descobrir organização do usuário
    select organization_id into v_org_id
    from public.organization_users
    where user_id = v_user_id and status = 'active'
    limit 1;

    if v_org_id is null then
        return;
    end if;

    -- 2. Retornar leads compatíveis
    return query
    select
        l.id,
        l."createdAt",
        l."serviceSlug",
        l.zip,
        loc.city,
        loc.state,
        l.details,
        l.subtype as urgency,
        coalesce(st.default_lead_price, 50.00) as base_price
    from public.leads l
    left join public.us_locations loc on loc.zip = l.zip
    left join public.service_tasks st on st.id = l.service_task_id
    where l.source = 'public'
      and l.organization_id = '45689bbf-193b-4ae8-82f4-e32bbe63b6dd'::uuid
      and l.status = 'New'
      -- Esconder os que já foram distribuídos para 3 empresas (ou que esta empresa já comprou)
      and not exists (
          select 1 from public.lead_distributions ld 
          where ld.lead_id = l.id and ld.organization_id = v_org_id
      )
      and (
          select count(*) from public.lead_distributions ld2 where ld2.lead_id = l.id
      ) < 3
      -- Filtrar compatibilidade de ZIP
      and exists (
          select 1 from public.company_service_areas csa 
          where csa.organization_id = v_org_id and csa.zip = l.zip and csa.active = true
      )
      -- Filtrar compatibilidade de Task
      and exists (
          select 1 from public.company_services cs 
          where cs.organization_id = v_org_id and cs.service_task_id = l.service_task_id and cs.active = true
      );
end;
$$;

grant execute on function public.get_public_available_leads() to authenticated;
