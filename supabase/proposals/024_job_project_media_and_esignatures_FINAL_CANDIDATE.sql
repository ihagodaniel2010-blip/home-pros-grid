-- =============================================================================
-- PROPOSAL FOR MANUAL REVIEW ONLY — DO NOT EXECUTE AUTOMATICALLY
-- 024_job_project_media_and_esignatures_FINAL_CANDIDATE.sql
-- Production-Grade Architecture Candidate for E-Signatures, Snapshots, Audit Trails, and Private Media
-- =============================================================================

-- =============================================================================
-- SECTION 0: HELPER FUNCTIONS & TRIGGERS
-- =============================================================================

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Universal Immutability Guard Function (Blocks UPDATE and DELETE)
create or replace function public.prevent_immutable_modification()
returns trigger
language plpgsql
security definer
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
    tax_rate numeric(5,4) not null default 0 check (tax_rate >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    total_amount numeric(12,2) not null check (total_amount >= 0),
    revised_total numeric(12,2) check (revised_total >= 0),
    currency text not null default 'USD' check (length(currency) = 3),
    schedule_impact text,
    terms_text text not null,
    
    -- Cryptographic Document Integrity Hash (SHA-256)
    document_hash text not null check (length(document_hash) = 64),
    created_at timestamptz not null default now(),
    
    -- Unique version identifier per organization document
    constraint uq_document_versions_org_doc_ver unique (organization_id, document_type, document_id, version_number),
    
    -- Composite unique key to enforce signature consistency
    constraint uq_document_versions_composite unique (id, organization_id, document_type, document_id, document_hash)
);

-- Attach Immutability Trigger (Prevent any UPDATE or DELETE)
create trigger trg_immutable_document_versions
before update or delete on public.document_versions
for each row execute function public.prevent_immutable_modification();

-- =============================================================================
-- SECTION 2: AUDITABLE ELECTRONIC SIGNATURES
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
    signed_document_storage_path text,
    document_hash text not null check (length(document_hash) = 64),
    created_at timestamptz not null default now(),
    
    -- Strict Composite Foreign Key ensuring signature matches EXACT document_version properties
    constraint fk_electronic_signatures_version_composite
        foreign key (document_version_id, organization_id, document_type, document_id, document_hash)
        references public.document_versions(id, organization_id, document_type, document_id, document_hash)
        on delete restrict
);

-- Ensure a signer role can only sign a specific version ONCE
create unique index if not exists idx_electronic_signatures_unique_role_version
on public.electronic_signatures(document_version_id, signer_role);

-- Attach Immutability Trigger (Prevent any UPDATE or DELETE)
create trigger trg_immutable_electronic_signatures
before update or delete on public.electronic_signatures
for each row execute function public.prevent_immutable_modification();

-- =============================================================================
-- SECTION 3: DOCUMENT SIGNATURE AUDIT EVENTS
-- =============================================================================

create table if not exists public.document_signature_events (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    document_version_id uuid,
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

    -- Foreign key to organization
    constraint fk_signature_events_org foreign key (organization_id) references public.organizations(id) on delete restrict
);

-- Attach Immutability Trigger (Prevent any UPDATE or DELETE)
create trigger trg_immutable_document_signature_events
before update or delete on public.document_signature_events
for each row execute function public.prevent_immutable_modification();

-- =============================================================================
-- SECTION 4: SERVICE JOB MEDIA (PRIVATE BY DEFAULT)
-- =============================================================================

create table if not exists public.service_job_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_job_id uuid not null references public.service_jobs(id) on delete cascade,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null check (length(trim(storage_path)) > 0),
    file_name text not null,
    mime_type text not null,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    caption text,
    sort_order integer default 0,
    visible_to_client boolean not null default false, -- Default PRIVATE
    visible_on_public_site boolean not null default false, -- Default PRIVATE
    portfolio_approved boolean not null default false, -- Double-lock requiring Admin approval
    media_status text not null default 'pending' check (media_status in ('pending', 'approved', 'rejected')),
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger trg_service_job_media_updated_at
before update on public.service_job_media
for each row execute function public.set_updated_at();

-- =============================================================================
-- SECTION 5: SERVICE EXTRA MEDIA (CHANGE ORDERS)
-- =============================================================================

create table if not exists public.service_extra_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_extra_id uuid not null references public.service_extras(id) on delete cascade,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null check (length(trim(storage_path)) > 0),
    file_name text not null,
    mime_type text not null,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    caption text,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- =============================================================================
-- SECTION 6: SERVICE EXTRAS (EDITABLE CHANGE ORDER DATA EXPANSION PROPOSAL)
-- =============================================================================

-- Proposal to add editable draft fields to service_extras before freezing into document_versions snapshot
alter table public.service_extras
add column if not exists previous_contract_price numeric(12,2) check (previous_contract_price >= 0),
add column if not exists revised_contract_price numeric(12,2) check (revised_contract_price >= 0),
add column if not exists schedule_impact text;

-- =============================================================================
-- SECTION 7: INDEXES FOR PERFORMANCE
-- =============================================================================

create index if not exists idx_document_versions_lookup on public.document_versions(organization_id, document_type, document_id);
create index if not exists idx_electronic_signatures_doc on public.electronic_signatures(organization_id, document_id);
create index if not exists idx_electronic_signatures_ver on public.electronic_signatures(document_version_id);
create index if not exists idx_signature_events_lookup on public.document_signature_events(document_id, document_version_id);
create index if not exists idx_service_job_media_job on public.service_job_media(organization_id, service_job_id);
create index if not exists idx_service_job_media_public on public.service_job_media(visible_on_public_site, portfolio_approved) where visible_on_public_site = true and portfolio_approved = true;
create index if not exists idx_service_extra_media_extra on public.service_extra_media(organization_id, service_extra_id);

-- =============================================================================
-- SECTION 8: ROW LEVEL SECURITY & POLICIES
-- =============================================================================

alter table public.document_versions enable row level security;
alter table public.electronic_signatures enable row level security;
alter table public.document_signature_events enable row level security;
alter table public.service_job_media enable row level security;
alter table public.service_extra_media enable row level security;

-- Manager Policies
create policy "Company managers can view document versions"
on public.document_versions for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers can view electronic signatures"
on public.electronic_signatures for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers can view signature events"
on public.document_signature_events for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers can manage job media"
on public.service_job_media for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers can manage extra media"
on public.service_extra_media for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Worker Policy using existing verified function public.is_worker_assigned_to_job(p_service_job_id)
create policy "Assigned workers can view job media"
on public.service_job_media for select
using (public.is_worker_assigned_to_job(service_job_id));

-- Double-Lock Public Portfolio View
create or replace view public.public_portfolio_media as
select
    id,
    media_type,
    caption,
    created_at
from public.service_job_media
where visible_on_public_site = true
  and portfolio_approved = true;

grant select on public.public_portfolio_media to anon, authenticated;

-- =============================================================================
-- SECTION 9: HARDENED SECURE CLIENT ACCESS RPC
-- =============================================================================

create or replace function public.get_client_job_media(p_job_token text)
returns table (
    id uuid,
    media_type text,
    file_name text,
    caption text,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_job_id uuid;
begin
    -- Locate job_id via valid token
    select sj.id into v_job_id
    from public.service_jobs sj
    join public.estimates e on e.id = sj.estimate_id
    where e.public_token = p_job_token;

    if v_job_id is null then
        return;
    end if;

    -- Return only metadata for client-visible media (NO private storage paths exposed)
    return query
    select sjm.id, sjm.media_type, sjm.file_name, sjm.caption, sjm.created_at
    from public.service_job_media sjm
    where sjm.service_job_id = v_job_id
      and sjm.visible_to_client = true;
end;
$$;

-- Hardening permissions: Revoke from PUBLIC, grant specifically to anon and authenticated
revoke all on function public.get_client_job_media(text) from public;
grant execute on function public.get_client_job_media(text) to anon, authenticated;

-- =============================================================================
-- SECTION 10: PRIVATE STORAGE BUCKETS & POLICIES DECLARATION (PROPOSAL ONLY)
-- =============================================================================

-- Buckets MUST be private: signatures, job-media, signed-documents
-- Storage policies for storage.objects:

create policy "Org Managers Access Private Signatures"
on storage.objects for select
using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1]::uuid in (
        select org_id from public.organization_users where user_id = auth.uid()
    )
);

create policy "Org Managers Access Private Job Media"
on storage.objects for all
using (
    bucket_id = 'job-media'
    and (storage.foldername(name))[1]::uuid in (
        select org_id from public.organization_users where user_id = auth.uid()
    )
);

create policy "Org Managers Access Private Signed Documents"
on storage.objects for select
using (
    bucket_id = 'signed-documents'
    and (storage.foldername(name))[1]::uuid in (
        select org_id from public.organization_users where user_id = auth.uid()
    )
);
