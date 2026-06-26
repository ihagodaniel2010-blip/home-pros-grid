-- Teste ROLLBACK para a Fase 5.4.3
-- Testa a criação da RPC e o envio de um lead, revertendo no final.

BEGIN;

-- 1. Declarar a função que substitui o digest()
create or replace function public.generate_public_token()
returns text language sql as $$
    select concat('lead_', replace(gen_random_uuid()::text, '-', ''));
$$;

-- 2. Declarar a função submit_public_lead
create or replace function public.submit_public_lead(
    p_service_slug text,
    p_selected_service_option text,
    p_location_type text,
    p_full_name text,
    p_email text,
    p_phone text,
    p_zip text,
    p_address text,
    p_details text default null,
    p_subtype text default null,
    p_media_urls jsonb default null,
    p_selected_pros jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_lead_id uuid;
    v_now timestamptz := now();
begin
    insert into public.leads (
        source, status, organization_id, "serviceSlug", "selectedServiceOption",
        "locationType", "fullName", email, phone, zip, address, details, subtype,
        "createdAt", "updatedAt"
    ) values (
        'public', 'New', null, p_service_slug, p_selected_service_option,
        p_location_type, p_full_name, p_email, p_phone, p_zip, p_address, p_details, p_subtype,
        v_now, v_now
    )
    returning id into v_lead_id;

    return jsonb_build_object('success', true, 'lead_id', v_lead_id);
end;
$$;

-- 3. Testar chamada simulando um usuário anônimo
do $$
declare
    v_result jsonb;
begin
    v_result := public.submit_public_lead(
        'drywall',
        'Ceiling Repair',
        'Home / Residence',
        'Test Lead',
        'test@example.com',
        '9999999999',
        '04064',
        'Test Address',
        'It is leaking',
        'Ceiling Repair'
    );

    if (v_result->>'success')::boolean = true then
        raise notice 'Test success! Created lead ID: %', v_result->>'lead_id';
    else
        raise exception 'Test failed: %', v_result->>'error';
    end if;
end $$;

ROLLBACK;
