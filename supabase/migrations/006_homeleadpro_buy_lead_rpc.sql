-- Proposta para Fase 5.3.1 - Lead Market (Comprar/Receber Lead) Corrigida
-- Este arquivo NÃO DEVE ser aplicado automaticamente. Aguardar revisão e aprovação.

-- 1. Função para listar leads públicos disponíveis para a empresa
create or replace function public.get_public_available_leads()
returns table (
    id uuid,
    status text,
    created_at timestamptz,
    city text,
    state text,
    zip_code text,
    urgency text,
    details text,
    is_public boolean,
    service_slug text,
    base_price numeric
)
language plpgsql security definer set search_path = public
as $$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_role text;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return; -- Return empty set if not logged in
    end if;

    -- Usando a tabela real organization_users confirmada
    select ou.organization_id, ou.role into v_org_id, v_role
    from public.organization_users ou
    where ou.user_id = v_user_id and ou.status = 'active'
    limit 1;

    -- Bloqueia worker e garante que o usuário pertence a uma organização
    if v_org_id is null or v_role not in ('owner', 'admin', 'super_admin') then
        return; -- Return empty set
    end if;

    return query
    select 
        l.id, l.status, l."createdAt" as created_at,
        ''::text as city, ''::text as state, l.zip as zip_code, l.urgency,
        coalesce(l."ownerNotes", l."selectedServiceOption", '') as details,
        (l.source = 'public') as is_public, l."serviceSlug" as service_slug,
        coalesce(
            (select pr.base_price from public.lead_pricing_rules pr where pr.service_category_id = l.service_category_id and pr.active = true order by pr.created_at desc limit 1), 
            30.00 
        ) as base_price
    from public.leads l
    where l.source = 'public' and lower(l.status) = 'new'
      and not exists (select 1 from public.lead_distributions ld where ld.lead_id = l.id and ld.organization_id = v_org_id)
    order by l."createdAt" desc;
end;
$$;

-- 2. Função para comprar um lead público
create or replace function public.buy_public_lead(p_lead_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
    v_user_id uuid;
    v_organization_id uuid;
    v_role text;
    v_lead_source text;
    v_service_category_id uuid;
    v_base_price numeric;
    v_current_balance numeric;
    v_already_bought boolean;
begin
    v_user_id := auth.uid();
    if v_user_id is null then return jsonb_build_object('success', false, 'message', 'Unauthorized. User not logged in.'); end if;

    -- Usando a tabela real organization_users confirmada
    select ou.organization_id, ou.role into v_organization_id, v_role 
    from public.organization_users ou
    where ou.user_id = v_user_id and ou.status = 'active'
    limit 1;
    
    if v_organization_id is null then return jsonb_build_object('success', false, 'message', 'User does not belong to an active organization.'); end if;
    if v_role not in ('owner', 'admin', 'super_admin') then return jsonb_build_object('success', false, 'message', 'Only owners or admins can buy leads.'); end if;

    select l.source, l.service_category_id into v_lead_source, v_service_category_id from public.leads l where l.id = p_lead_id;
    if v_lead_source is null or v_lead_source != 'public' then return jsonb_build_object('success', false, 'message', 'Lead not found or not public.'); end if;

    select exists (select 1 from public.lead_distributions ld where ld.lead_id = p_lead_id and ld.organization_id = v_organization_id) into v_already_bought;
    if v_already_bought then return jsonb_build_object('success', false, 'message', 'Your organization has already purchased this lead.'); end if;

    select pr.base_price into v_base_price from public.lead_pricing_rules pr where pr.service_category_id = v_service_category_id and pr.active = true order by pr.created_at desc limit 1;
    if v_base_price is null then v_base_price := 30.00; end if;

    v_current_balance := public.get_organization_credit_balance(v_organization_id);
    if v_current_balance < v_base_price then return jsonb_build_object('success', false, 'message', 'Insufficient credit balance.', 'required', v_base_price, 'balance', v_current_balance); end if;

    insert into public.lead_distributions (lead_id, organization_id, price_charged, status, charged_at, distributed_at) 
    values (p_lead_id, v_organization_id, v_base_price, 'distributed', now(), now());

    insert into public.organization_credit_ledger (organization_id, amount, transaction_type, reference_type, reference_id, balance_after, description) 
    values (v_organization_id, -v_base_price, 'lead_debit', 'lead_distribution', p_lead_id, v_current_balance - v_base_price, 'Purchased lead ' || p_lead_id);

    return jsonb_build_object('success', true, 'message', 'Lead purchased successfully.', 'price_charged', v_base_price, 'new_balance', v_current_balance - v_base_price);
exception when others then return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

-- 3. Grants
grant execute on function public.get_public_available_leads() to authenticated;
grant execute on function public.buy_public_lead(uuid) to authenticated;
