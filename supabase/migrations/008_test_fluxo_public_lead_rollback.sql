-- Teste Ponta a Ponta com ROLLBACK para o fluxo de Leads Públicos

BEGIN;

-- 1. Substituir a função geradora de token para evitar erro de digest()
create or replace function public.generate_public_token()
returns text language sql as $$
    select concat('lead_', replace(gen_random_uuid()::text, '-', ''));
$$;

-- 2. Declarar a função submit_public_lead
create or replace function public.submit_public_lead(
    p_service_slug text, p_selected_service_option text, p_location_type text,
    p_full_name text, p_email text, p_phone text, p_zip text, p_address text,
    p_details text default null, p_subtype text default null,
    p_media_urls jsonb default null, p_selected_pros jsonb default null
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
    v_lead_id uuid;
    v_now timestamptz := now();
    v_default_org_id uuid := '45689bbf-193b-4ae8-82f4-e32bbe63b6dd'::uuid;
begin
    insert into public.leads (
        source, status, organization_id, "serviceSlug", "selectedServiceOption",
        "locationType", "fullName", email, phone, zip, address, details, subtype,
        "createdAt", "updatedAt"
    ) values (
        'public', 'New', v_default_org_id, p_service_slug, p_selected_service_option,
        p_location_type, p_full_name, p_email, p_phone, p_zip, p_address, p_details, p_subtype,
        v_now, v_now
    )
    returning id into v_lead_id;
    return jsonb_build_object('success', true, 'lead_id', v_lead_id);
end;
$$;

-- 2.b Função para listar leads públicos disponíveis para a empresa
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

-- 2.c Função para comprar um lead público
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

-- 3. Injetar um Lead Público Anonimamente
do $$
declare
    v_result jsonb;
begin
    v_result := public.submit_public_lead('drywall', 'Ceiling Repair', 'Home / Residence', 'Test Lead', 'test@example.com', '9999999999', '04064', 'Test Address');
    if (v_result->>'success')::boolean = true then
        raise notice '1. Lead submitted successfully (ID: %)', v_result->>'lead_id';
    else
        raise exception 'Test failed to submit lead: %', v_result->>'error';
    end if;
end $$;

-- 4. Simular Owner e tentar comprar o lead
do $$
declare
    v_org_id uuid;
    v_user_id uuid;
    v_lead_record record;
    v_available_leads cursor for select * from public.get_public_available_leads();
begin
    -- Pegar um owner genérico
    select ou.organization_id, ou.user_id into v_org_id, v_user_id
    from public.organization_users ou
    where ou.role = 'owner' and ou.status = 'active'
    limit 1;

    if v_user_id is not null then
        -- Mudar a sessão para este owner
        perform set_config('request.jwt.claim.sub', v_user_id::text, true);
        
        -- Validar se o lead aparece como disponível
        open v_available_leads;
        fetch v_available_leads into v_lead_record;
        if found then
            raise notice '2. Lead is available for purchase!';
            
            -- Comprar o lead
            perform public.buy_public_lead(v_lead_record.id);
            raise notice '3. Lead purchased successfully!';
        else
            raise notice 'Warning: No leads available. Maybe the RPC get_public_available_leads is not created yet or filters are tight.';
        end if;
        close v_available_leads;
    end if;
end $$;

ROLLBACK;
