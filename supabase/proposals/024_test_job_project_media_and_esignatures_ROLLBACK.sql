-- =============================================================================
-- PROPOSAL ROLLBACK TEST SCRIPT ONLY — DO NOT EXECUTE IN PRODUCTION
-- 024_test_job_project_media_and_esignatures_ROLLBACK.sql
-- Runs temporary schema creation inside an isolated transaction and immediately ROLLS BACK.
-- LEAVES ZERO PERSISTENT CHANGES IN DATABASE. NO CASCADE DROP USED.
-- =============================================================================

BEGIN;

-- 1. Create temporary test schema structures
create table if not exists public.document_versions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    version_number integer not null default 1,
    client_name text not null,
    client_email text not null,
    project_address text,
    scope_text text not null,
    line_items_json jsonb not null default '[]'::jsonb,
    previous_contract_price numeric check (previous_contract_price >= 0),
    change_amount numeric default 0,
    subtotal numeric not null check (subtotal >= 0),
    tax_rate numeric not null default 0 check (tax_rate >= 0),
    tax_amount numeric not null default 0 check (tax_amount >= 0),
    discount_amount numeric not null default 0 check (discount_amount >= 0),
    total_amount numeric not null check (total_amount >= 0),
    revised_total numeric check (revised_total >= 0),
    schedule_impact text,
    terms_text text not null,
    document_hash text not null check (length(document_hash) = 64),
    created_at timestamptz not null default now(),
    constraint idx_temp_doc_versions_unique unique (document_id, version_number)
);

create table if not exists public.electronic_signatures (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    document_version_id uuid not null references public.document_versions(id),
    signer_role text not null check (signer_role in ('client', 'contractor')),
    signer_name text not null check (length(trim(signer_name)) > 0),
    signer_email text not null,
    signed_at timestamptz not null default now(),
    ip_address text not null,
    user_agent text not null,
    consent_version text not null default 'v1.0_UETA_ESIGN',
    consent_text text not null,
    signature_storage_path text not null,
    signed_document_storage_path text,
    document_hash text not null check (length(document_hash) = 64),
    created_at timestamptz not null default now()
);

create unique index if not exists idx_temp_signatures_unique_role_ver
on public.electronic_signatures(document_version_id, signer_role);

create table if not exists public.service_job_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    service_job_id uuid not null,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null,
    file_name text not null,
    mime_type text not null,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    caption text,
    sort_order integer default 0,
    visible_to_client boolean not null default false,
    visible_on_public_site boolean not null default false,
    portfolio_approved boolean not null default false,
    media_status text not null default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Test inserting document version snapshot
insert into public.document_versions (
    id, organization_id, document_type, document_id, version_number,
    client_name, client_email, scope_text, subtotal, total_amount, terms_text, document_hash
) values (
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    'estimate', '00000000-0000-0000-0000-000000000002', 1,
    'Test Client', 'client@example.com', 'Demolition & Framing Scope', 1000.00, 1060.00,
    'Payment due upon receipt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
);

-- 3. Test client signature insertion
insert into public.electronic_signatures (
    organization_id, document_type, document_id, document_version_id,
    signer_role, signer_name, signer_email, ip_address, user_agent, consent_text,
    signature_storage_path, document_hash
) values (
    '00000000-0000-0000-0000-000000000000', 'estimate', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001', 'client', 'Test Client', 'client@example.com',
    '192.168.1.1', 'Mozilla/5.0 TestAgent', 'I agree to conduct this transaction electronically.',
    'signatures/org/doc/v1/client.png', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
);

-- 4. Test contractor signature insertion
insert into public.electronic_signatures (
    organization_id, document_type, document_id, document_version_id,
    signer_role, signer_name, signer_email, ip_address, user_agent, consent_text,
    signature_storage_path, document_hash
) values (
    '00000000-0000-0000-0000-000000000000', 'estimate', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001', 'contractor', 'Hugo Manager', 'hugo@h-a-construction.com',
    '10.0.0.1', 'Mozilla/5.0 ContractorAgent', 'Countersigned on behalf of H&A Construction LLC.',
    'signatures/org/doc/v1/contractor.png', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
);

-- 5. Test duplicate client signature guard (MUST FAIL if duplicate role inserted)
do $$
begin
    insert into public.electronic_signatures (
        organization_id, document_type, document_id, document_version_id,
        signer_role, signer_name, signer_email, ip_address, user_agent, consent_text,
        signature_storage_path, document_hash
    ) values (
        '00000000-0000-0000-0000-000000000000', 'estimate', '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001', 'client', 'Duplicate Signer', 'dup@example.com',
        '192.168.1.2', 'Mozilla/5.0', 'Consent', 'sig.png', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    raise exception 'TEST FAILED: Duplicate signature guard did not block duplicate role!';
exception when unique_violation then
    -- Expected result
    null;
end;
$$;

-- 6. Test default media privacy (MUST be false by default)
insert into public.service_job_media (
    organization_id, service_job_id, media_type, storage_path, file_name, mime_type, file_size_bytes
) values (
    '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003',
    'image', 'job-media/org/job/photo1.jpg', 'photo1.jpg', 'image/jpeg', 1048576
);

-- Verify defaults
do $$
declare
    v_rec record;
begin
    select visible_to_client, visible_on_public_site, portfolio_approved
    into v_rec
    from public.service_job_media
    limit 1;

    if v_rec.visible_to_client is not false or v_rec.visible_on_public_site is not false or v_rec.portfolio_approved is not false then
        raise exception 'TEST FAILED: Default media privacy is not strictly FALSE!';
    end if;
end;
$$;

-- ALWAYS ROLL BACK TRANSACTION — LEAVES ZERO PERSISTENT CHANGES
ROLLBACK;
