-- Proposta para Fase 5.4.3 e 5.4.5 - Envio Seguro de Lead Público (SECURITY DEFINER)
-- Este arquivo NÃO DEVE ser aplicado automaticamente. Aguardar revisão e aprovação.

-- 1. Substituir a função geradora de token para não depender de digest() (pgcrypto)
create or replace function public.generate_public_token()
returns text language sql as $$
    select concat('lead_', replace(gen_random_uuid()::text, '-', ''));
$$;

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
set search_path = public, extensions
as $$
declare
    v_lead_id uuid;
    v_now timestamptz := now();
    v_default_org_id uuid := '45689bbf-193b-4ae8-82f4-e32bbe63b6dd'::uuid;
begin
    -- Realiza o insert na tabela public.leads usando a identidade (SECURITY DEFINER)
    -- que contorna a restrição de RLS (que bloqueia o usuário anônimo).
    -- Forçamos status='New', source='public' e organization_id = v_default_org_id
    insert into public.leads (
        source,
        status,
        organization_id,
        "serviceSlug",
        "selectedServiceOption",
        "locationType",
        "fullName",
        email,
        phone,
        zip,
        address,
        details,
        subtype,
        media_urls,
        "selectedPros",
        "statusHistory",
        "createdAt",
        "updatedAt"
    ) values (
        'public',
        'New',
        v_default_org_id,
        p_service_slug,
        p_selected_service_option,
        p_location_type,
        p_full_name,
        p_email,
        p_phone,
        p_zip,
        p_address,
        p_details,
        p_subtype,
        p_media_urls,
        p_selected_pros,
        jsonb_build_array(jsonb_build_object('status', 'New', 'timestamp', v_now)),
        v_now,
        v_now
    )
    returning id into v_lead_id;

    return jsonb_build_object('success', true, 'lead_id', v_lead_id);
exception
    when others then
        -- Caso alguma coluna não exista (ex: media_urls), tentamos fallback omitindo os campos mais novos
        begin
            insert into public.leads (
                source,
                status,
                organization_id,
                "serviceSlug",
                "selectedServiceOption",
                "locationType",
                "fullName",
                email,
                phone,
                zip,
                address,
                details,
                subtype,
                "createdAt",
                "updatedAt"
            ) values (
                'public',
                'New',
                v_default_org_id,
                p_service_slug,
                p_selected_service_option,
                p_location_type,
                p_full_name,
                p_email,
                p_phone,
                p_zip,
                p_address,
                p_details,
                p_subtype,
                v_now,
                v_now
            )
            returning id into v_lead_id;
            
            return jsonb_build_object('success', true, 'lead_id', v_lead_id, 'warning', 'inserted_with_fallback');
        exception
            when others then
                return jsonb_build_object('success', false, 'error', SQLERRM);
        end;
end;
$$;

grant execute on function public.submit_public_lead(text, text, text, text, text, text, text, text, text, text, jsonb, jsonb) to anon;
grant execute on function public.submit_public_lead(text, text, text, text, text, text, text, text, text, text, jsonb, jsonb) to authenticated;
