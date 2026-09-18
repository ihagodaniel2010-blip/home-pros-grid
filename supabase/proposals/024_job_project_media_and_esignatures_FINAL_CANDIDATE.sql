-- =============================================================================
-- PROPOSAL FOR MANUAL REVIEW ONLY — DO NOT EXECUTE AUTOMATICALLY
-- 024_job_project_media_and_esignatures_FINAL_CANDIDATE.sql
-- Production-Grade Multi-Tenant Hardened Architecture Candidate for E-Signatures, Snapshots, Audit Trails, and Private Media
-- =============================================================================

-- =============================================================================
-- SECTION 0: HELPER FUNCTIONS & TRIGGERS (LEAST PRIVILEGE - NO SECURITY DEFINER)
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.prevent_immutable_modification()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    raise exception 'SECURITY ERROR: Table % is strictly immutable. UPDATE and DELETE are prohibited.', TG_TABLE_NAME;
    return null;
end;
$$;

-- =============================================================================
-- SECTION 1: IMMUTABLE DOCUMENT VERSIONS / SNAPSHOTS
-- =============================================================================

create table if not exists public.document_versions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    version_number integer not null check (version_number > 0),
    
    -- Full Legal Contractor Snapshot
    contractor_legal_name text not null,
    contractor_company_name text not null,
    contractor_address text,
    contractor_phone text,
    contractor_email text not null,
    
    -- Full Client & Property Snapshot
    client_name text not null,
    client_email text not null check (client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    client_phone text,
    project_address text,
    
    -- Scope & Financial Snapshot
    scope_text text not null,
    line_items_json jsonb not null default '[]'::jsonb,
    previous_contract_price numeric(12,2) check (previous_contract_price >= 0),
    change_amount numeric(12,2) default 0,
    subtotal numeric(12,2) not null check (subtotal >= 0),
    
    -- Tax rate stored as decimal factor: e.g. 6.5% = 0.0650
    tax_rate numeric(6,4) not null default 0 check (tax_rate >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    total_amount numeric(12,2) not null check (total_amount >= 0),
    revised_total numeric(12,2) check (revised_total >= 0),
    currency text not null default 'USD' check (length(currency) = 3),
    schedule_impact text,
    terms_text text not null,
    
    -- Cryptographic Document Integrity Hash (Strict SHA-256 Hex Lowercase)
    document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
    created_at timestamptz not null default now(),
    
    -- Unique version identifier per organization document
    constraint uq_document_versions_org_doc_ver unique (organization_id, document_type, document_id, version_number),
    
    -- Composite unique key to enforce signature & event consistency
    constraint uq_document_versions_composite unique (id, organization_id, document_type, document_id, document_hash)
);

create trigger trg_immutable_document_versions
before update or delete on public.document_versions
for each row execute function public.prevent_immutable_modification();

-- =============================================================================
-- SECTION 2: AUDITABLE ELECTRONIC SIGNATURES (APPEND-ONLY, NO SIGNED PDF PATH)
-- =============================================================================

create table if not exists public.electronic_signatures (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    document_version_id uuid not null,
    signer_role text not null check (signer_role in ('client', 'contractor')),
    signer_name text not null check (length(trim(signer_name)) > 0),
    signer_email text not null check (signer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    signed_at timestamptz not null default now(), -- Captured server-side
    ip_address text not null, -- Captured server-side
    user_agent text not null, -- Captured server-side
    consent_version text not null default 'v1.0_UETA_ESIGN',
    consent_text text not null,
    signature_storage_path text not null check (length(trim(signature_storage_path)) > 0),
    document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
    created_at timestamptz not null default now(),
    
    -- Strict Composite Foreign Key ensuring signature matches EXACT document_version properties
    constraint fk_electronic_signatures_version_composite
        foreign key (document_version_id, organization_id, document_type, document_id, document_hash)
        references public.document_versions(id, organization_id, document_type, document_id, document_hash)
        on delete restrict
);

create unique index if not exists idx_electronic_signatures_unique_role_version
on public.electronic_signatures(document_version_id, signer_role);

create trigger trg_immutable_electronic_signatures
before update or delete on public.electronic_signatures
for each row execute function public.prevent_immutable_modification();

-- =============================================================================
-- SECTION 3: IMMUTABLE SIGNED DOCUMENT ARTIFACTS (FINAL CONVERTED PDF)
-- =============================================================================

create table if not exists public.signed_document_artifacts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    document_version_id uuid not null,
    document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
    storage_path text not null check (length(trim(storage_path)) > 0),
    pdf_hash text not null check (pdf_hash ~ '^[0-9a-f]{64}$'),
    generated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),

    constraint uq_signed_document_artifacts_version unique (document_version_id),
    
    constraint fk_signed_document_artifacts_version_composite
        foreign key (document_version_id, organization_id, document_type, document_id, document_hash)
        references public.document_versions(id, organization_id, document_type, document_id, document_hash)
        on delete restrict
);

create trigger trg_immutable_signed_document_artifacts
before update or delete on public.signed_document_artifacts
for each row execute function public.prevent_immutable_modification();

-- =============================================================================
-- SECTION 4: DOCUMENT SIGNATURE AUDIT EVENTS (STRICT COMPOSITE INTEGRITY)
-- =============================================================================

create table if not exists public.document_signature_events (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    document_version_id uuid not null,
    document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
    event_type text not null check (event_type in (
        'document_created',
        'document_sent',
        'document_viewed',
        'electronic_consent_accepted',
        'signature_started',
        'client_signed',
        'contractor_signed',
        'document_completed',
        'copy_sent'
    )),
    actor_type text not null check (actor_type in ('client', 'contractor', 'system')),
    actor_name text,
    actor_email text,
    ip_address text,
    user_agent text,
    occurred_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb,

    constraint fk_signature_events_version_composite
        foreign key (document_version_id, organization_id, document_type, document_id, document_hash)
        references public.document_versions(id, organization_id, document_type, document_id, document_hash)
        on delete restrict
);

create trigger trg_immutable_document_signature_events
before update or delete on public.document_signature_events
for each row execute function public.prevent_immutable_modification();

-- =============================================================================
-- SECTION 5: MULTI-TENANT HARDENED SERVICE JOB MEDIA
-- =============================================================================

-- Ensure service_jobs has composite unique constraint for Org integrity
alter table public.service_jobs
add constraint uq_service_jobs_id_org unique (id, organization_id);

create table if not exists public.service_job_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    service_job_id uuid not null,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null check (length(trim(storage_path)) > 0),
    file_name text not null,
    mime_type text not null,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    duration_seconds integer check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 60)),
    caption text,
    sort_order integer default 0,
    visible_to_client boolean not null default false, -- Default PRIVATE
    visible_on_public_site boolean not null default false, -- Default PRIVATE
    portfolio_approved boolean not null default false, -- Double-lock requiring Admin approval
    media_status text not null default 'pending' check (media_status in ('pending', 'approved', 'rejected')),
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- STRICT MULTI-TENANT COMPOSITE FK: Guarantees service_job belongs to same organization
    constraint fk_service_job_media_job_org
        foreign key (service_job_id, organization_id)
        references public.service_jobs(id, organization_id)
        on delete cascade
);

create trigger trg_service_job_media_updated_at
before update on public.service_job_media
for each row execute function public.set_updated_at();

-- =============================================================================
-- SECTION 6: MULTI-TENANT HARDENED SERVICE EXTRA MEDIA (CHANGE ORDERS)
-- =============================================================================

-- Ensure service_extras has composite unique constraint for Org integrity
alter table public.service_extras
add constraint uq_service_extras_id_org unique (id, organization_id);

create table if not exists public.service_extra_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    service_extra_id uuid not null,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null check (length(trim(storage_path)) > 0),
    file_name text not null,
    mime_type text not null,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    duration_seconds integer check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 60)),
    caption text,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),

    -- STRICT MULTI-TENANT COMPOSITE FK: Guarantees service_extra belongs to same organization
    constraint fk_service_extra_media_extra_org
        foreign key (service_extra_id, organization_id)
        references public.service_extras(id, organization_id)
        on delete cascade
);

-- =============================================================================
-- SECTION 7: SERVICE EXTRAS (EDITABLE DRAFT CHANGE ORDER EXPANSION)
-- =============================================================================

-- Note: amount column in service_extras stores change_order_amount.
-- revised_contract_price = previous_contract_price + amount
alter table public.service_extras
add column if not exists previous_contract_price numeric(12,2) check (previous_contract_price >= 0),
add column if not exists revised_contract_price numeric(12,2) check (revised_contract_price >= 0),
add column if not exists schedule_impact text;

-- =============================================================================
-- SECTION 8: INDEXES FOR PERFORMANCE
-- =============================================================================

create index if not exists idx_document_versions_lookup on public.document_versions(organization_id, document_type, document_id);
create index if not exists idx_electronic_signatures_doc on public.electronic_signatures(organization_id, document_id);
create index if not exists idx_electronic_signatures_ver on public.electronic_signatures(document_version_id);
create index if not exists idx_signed_artifacts_ver on public.signed_document_artifacts(document_version_id);
create index if not exists idx_signature_events_lookup on public.document_signature_events(document_id, document_version_id);
create index if not exists idx_service_job_media_job on public.service_job_media(organization_id, service_job_id);
create index if not exists idx_service_job_media_public on public.service_job_media(visible_on_public_site, portfolio_approved) where visible_on_public_site = true and portfolio_approved = true;
create index if not exists idx_service_extra_media_extra on public.service_extra_media(organization_id, service_extra_id);

-- =============================================================================
-- SECTION 9: ROW LEVEL SECURITY & POLICIES (STRICT SEGREGATION BY COMMAND)
-- =============================================================================

alter table public.document_versions enable row level security;
alter table public.electronic_signatures enable row level security;
alter table public.signed_document_artifacts enable row level security;
alter table public.document_signature_events enable row level security;
alter table public.service_job_media enable row level security;
alter table public.service_extra_media enable row level security;

-- Manager Policies
create policy "Company managers select document versions"
on public.document_versions for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers select electronic signatures"
on public.electronic_signatures for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers select signed document artifacts"
on public.signed_document_artifacts for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers select signature events"
on public.document_signature_events for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Media Policies (Managers Full Access)
create policy "Company managers select job media"
on public.service_job_media for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers insert job media"
on public.service_job_media for insert
with check (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers update job media"
on public.service_job_media for update
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'))
with check (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers delete job media"
on public.service_job_media for delete
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Extra Media Policies (Managers Full Access)
create policy "Company managers select extra media"
on public.service_extra_media for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers insert extra media"
on public.service_extra_media for insert
with check (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Worker Policy using existing verified function public.is_worker_assigned_to_job(p_service_job_id)
create policy "Assigned workers select job media"
on public.service_job_media for select
using (public.is_worker_assigned_to_job(service_job_id));

create policy "Assigned workers insert job media"
on public.service_job_media for insert
with check (public.is_worker_assigned_to_job(service_job_id));

-- =============================================================================
-- SECTION 10: HARDENED RPC FOR CLIENT & PUBLIC PORTFOLIO ACCESS
-- =============================================================================

-- 10A. Client Job Media Metadata RPC
create or replace function public.get_client_job_media(p_job_token text)
returns table (
    id uuid,
    media_type text,
    file_name text,
    caption text,
    duration_seconds integer,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_job_id uuid;
begin
    select sj.id into v_job_id
    from public.service_jobs sj
    join public.estimates e on e.id = sj.estimate_id
    where e.public_token = p_job_token;

    if v_job_id is null then
        return;
    end if;

    return query
    select sjm.id, sjm.media_type, sjm.file_name, sjm.caption, sjm.duration_seconds, sjm.created_at
    from public.service_job_media sjm
    where sjm.service_job_id = v_job_id
      and sjm.visible_to_client = true;
end;
$$;

revoke all on function public.get_client_job_media(text) from public;
grant execute on function public.get_client_job_media(text) to anon, authenticated;

-- 10B. Public Portfolio Media Metadata RPC (No direct table SELECT for anon)
create or replace function public.get_public_portfolio_media()
returns table (
    id uuid,
    media_type text,
    caption text,
    duration_seconds integer,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    return query
    select sjm.id, sjm.media_type, sjm.caption, sjm.duration_seconds, sjm.created_at
    from public.service_job_media sjm
    where sjm.visible_on_public_site = true
      and sjm.portfolio_approved = true;
end;
$$;

revoke all on function public.get_public_portfolio_media() from public;
grant execute on function public.get_public_portfolio_media() to anon, authenticated;

-- =============================================================================
-- SECTION 11: NON-OVERWRITING PRIVATE STORAGE BUCKET CREATION (SAFE INSERT)
-- =============================================================================

-- Canonical Storage Paths:
-- Job Media Photos: {organization_id}/jobs/{service_job_id}/photos/{uuid}.jpg
-- Job Media Videos: {organization_id}/jobs/{service_job_id}/videos/{uuid}.mp4
-- Job Extra Media: {organization_id}/jobs/{service_job_id}/extras/{service_extra_id}/{uuid}.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'signatures', 'signatures', false, 5242880, array['image/png']
where not exists (select 1 from storage.buckets where id = 'signatures');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'job-media', 'job-media', false, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
where not exists (select 1 from storage.buckets where id = 'job-media');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'signed-documents', 'signed-documents', false, 20971520, array['application/pdf']
where not exists (select 1 from storage.buckets where id = 'signed-documents');

-- =============================================================================
-- SECTION 12: MULTI-TENANT HARDENED STORAGE ACCESS POLICIES
-- =============================================================================

-- 12A. Signatures Bucket (Managers Read-Only)
create policy "Managers read signatures bucket"
on storage.objects for select
using (
    bucket_id = 'signatures'
    and exists (
        select 1 from public.organization_users ou
        where ou.user_id = auth.uid()
          and ou.role in ('owner', 'admin')
          and ou.organization_id::text = (storage.foldername(name))[1]
    )
);

-- 12B. Signed Documents Bucket (Managers Read-Only)
create policy "Managers read signed documents bucket"
on storage.objects for select
using (
    bucket_id = 'signed-documents'
    and exists (
        select 1 from public.organization_users ou
        where ou.user_id = auth.uid()
          and ou.role in ('owner', 'admin')
          and ou.organization_id::text = (storage.foldername(name))[1]
    )
);

-- 12C. Job Media Bucket (Managers Select - Validates Org + Job Relationship)
create policy "Managers select job media bucket"
on storage.objects for select
using (
    bucket_id = 'job-media'
    and exists (
        select 1 from public.organization_users ou
        join public.service_jobs sj on sj.organization_id = ou.organization_id
        where ou.user_id = auth.uid()
          and ou.role in ('owner', 'admin')
          and ou.organization_id::text = (storage.foldername(name))[1]
          and sj.id::text = (storage.foldername(name))[3]
    )
);

-- Job Media Bucket (Managers Insert - Validates Org + Job Relationship)
create policy "Managers insert job media bucket"
on storage.objects for insert
with check (
    bucket_id = 'job-media'
    and exists (
        select 1 from public.organization_users ou
        join public.service_jobs sj on sj.organization_id = ou.organization_id
        where ou.user_id = auth.uid()
          and ou.role in ('owner', 'admin')
          and ou.organization_id::text = (storage.foldername(name))[1]
          and sj.id::text = (storage.foldername(name))[3]
    )
);

-- Job Media Bucket (Managers Delete - Prevents Orphan Files)
create policy "Managers delete job media bucket"
on storage.objects for delete
using (
    bucket_id = 'job-media'
    and exists (
        select 1 from public.organization_users ou
        join public.service_jobs sj on sj.organization_id = ou.organization_id
        where ou.user_id = auth.uid()
          and ou.role in ('owner', 'admin')
          and ou.organization_id::text = (storage.foldername(name))[1]
          and sj.id::text = (storage.foldername(name))[3]
    )
);

-- Job Media Bucket (Assigned Workers Select - Validates Org + Job Relationship + Worker Assignment)
create policy "Assigned workers select job media bucket"
on storage.objects for select
using (
    bucket_id = 'job-media'
    and exists (
        select 1 from public.service_jobs sj
        where sj.id::text = (storage.foldername(name))[3]
          and sj.organization_id::text = (storage.foldername(name))[1]
          and public.is_worker_assigned_to_job(sj.id)
    )
);

-- Job Media Bucket (Assigned Workers Insert - Validates Org + Job Relationship + Worker Assignment)
create policy "Assigned workers insert job media bucket"
on storage.objects for insert
with check (
    bucket_id = 'job-media'
    and exists (
        select 1 from public.service_jobs sj
        where sj.id::text = (storage.foldername(name))[3]
          and sj.organization_id::text = (storage.foldername(name))[1]
          and public.is_worker_assigned_to_job(sj.id)
    )
);
