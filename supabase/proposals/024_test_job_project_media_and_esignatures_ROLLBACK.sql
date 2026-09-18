-- =============================================================================
-- PROPOSAL ROLLBACK TEST SCRIPT ONLY — DO NOT EXECUTE IN PRODUCTION
-- WARNING: DO NOT RUN THIS TEST ON PRODUCTION DB. DESTINED FOR LOCAL OR DEDICATED STAGING DB ONLY.
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
    version_number integer not null check (version_number > 0),
    contractor_legal_name text not null,
    contractor_company_name text not null,
    contractor_address text,
    contractor_phone text,
    contractor_email text not null,
    client_name text not null,
    client_email text not null,
    client_phone text,
    project_address text,
    scope_text text not null,
    line_items_json jsonb not null default '[]'::jsonb,
    previous_contract_price numeric(12,2) check (previous_contract_price >= 0),
    change_amount numeric(12,2) default 0,
    subtotal numeric(12,2) not null check (subtotal >= 0),
    tax_rate numeric(5,4) not null default 0 check (tax_rate >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    total_amount numeric(12,2) not null check (total_amount >= 0),
    revised_total numeric(12,2) check (revised_total >= 0),
    currency text not null default 'USD',
    schedule_impact text,
    terms_text text not null,
    document_hash text not null check (length(document_hash) = 64),
    created_at timestamptz not null default now(),
    constraint idx_temp_doc_versions_unique unique (organization_id, document_type, document_id, version_number),
    constraint uq_temp_document_versions_composite unique (id, organization_id, document_type, document_id, document_hash)
);

create table if not exists public.temp_service_jobs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    title text not null,
    constraint uq_temp_service_jobs_id_org unique (id, organization_id)
);

create table if not exists public.temp_service_extras (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    service_job_id uuid not null,
    amount numeric(12,2) not null default 0,
    constraint uq_temp_service_extras_id_org unique (id, organization_id),
    constraint fk_temp_service_extras_job_org foreign key (service_job_id, organization_id) references public.temp_service_jobs(id, organization_id)
);

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
    updated_at timestamptz not null default now(),
    constraint fk_temp_job_media_job_org foreign key (service_job_id, organization_id) references public.temp_service_jobs(id, organization_id)
);

create table if not exists public.service_extra_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    service_extra_id uuid not null,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null,
    file_name text not null,
    mime_type text not null,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    created_at timestamptz not null default now(),
    constraint fk_temp_extra_media_extra_org foreign key (service_extra_id, organization_id) references public.temp_service_extras(id, organization_id)
);

-- Seed temporary test entities
insert into public.temp_service_jobs (id, organization_id, title)
values 
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A Job 1'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B Job 1');

insert into public.temp_service_extras (id, organization_id, service_job_id, amount)
values
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 150.00),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 300.00);

-- TEST A: Org A + Job Org A -> PASS
insert into public.service_job_media (
    organization_id, service_job_id, media_type, storage_path, file_name, mime_type, file_size_bytes
) values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
    'image', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/jobs/11111111-1111-1111-1111-111111111111/photos/p1.jpg', 'p1.jpg', 'image/jpeg', 1048576
);

-- TEST B: Org A + Job Org B -> MUST FAIL
do $$
begin
    insert into public.service_job_media (
        organization_id, service_job_id, media_type, storage_path, file_name, mime_type, file_size_bytes
    ) values (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222',
        'image', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/jobs/22222222-2222-2222-2222-222222222222/photos/p2.jpg', 'p2.jpg', 'image/jpeg', 1048576
    );
    raise exception 'TEST B FAILED: Mismatch between Org A and Job Org B was not blocked by Composite FK!';
exception when foreign_key_violation then
    -- Expected result
    null;
end;
$$;

-- TEST C: Org A + Extra Org B -> MUST FAIL
do $$
begin
    insert into public.service_extra_media (
        organization_id, service_extra_id, media_type, storage_path, file_name, mime_type, file_size_bytes
    ) values (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444',
        'image', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/jobs/22222222-2222-2222-2222-222222222222/extras/44444444-4444-4444-4444-444444444444/e1.jpg', 'e1.jpg', 'image/jpeg', 1048576
    );
    raise exception 'TEST C FAILED: Mismatch between Org A and Extra Org B was not blocked by Composite FK!';
exception when foreign_key_violation then
    -- Expected result
    null;
end;
$$;

-- ALWAYS ROLL BACK TRANSACTION — LEAVES ZERO PERSISTENT CHANGES
ROLLBACK;
