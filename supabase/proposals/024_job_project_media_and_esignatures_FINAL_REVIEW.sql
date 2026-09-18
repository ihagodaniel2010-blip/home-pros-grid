-- =============================================================================
-- PROPOSAL FOR MANUAL REVIEW ONLY — DO NOT EXECUTE AUTOMATICALLY
-- 024_job_project_media_and_esignatures_FINAL_REVIEW.sql
-- Production-Grade Architecture Proposal for E-Signatures, Snapshots, Audit Trails, and Private Media
-- =============================================================================

-- =============================================================================
-- SECTION 1: IMMUTABLE DOCUMENT VERSIONS / SNAPSHOTS
-- =============================================================================

create table if not exists public.document_versions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
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
    document_hash text not null check (length(document_hash) = 64), -- SHA-256 hex string
    created_at timestamptz not null default now(),
    constraint idx_document_versions_unique_doc_version unique (document_id, version_number)
);

-- =============================================================================
-- SECTION 2: AUDITABLE ELECTRONIC SIGNATURES
-- =============================================================================

create table if not exists public.electronic_signatures (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    document_version_id uuid not null references public.document_versions(id) on delete restrict,
    signer_role text not null check (signer_role in ('client', 'contractor')),
    signer_name text not null check (length(trim(signer_name)) > 0),
    signer_email text not null check (signer_email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    signed_at timestamptz not null default now(), -- Captured server-side
    ip_address text not null, -- Observed by server endpoint
    user_agent text not null, -- Captured server-side
    consent_version text not null default 'v1.0_UETA_ESIGN',
    consent_text text not null,
    signature_storage_path text not null, -- Reference in private signatures bucket
    signed_document_storage_path text, -- Reference in private signed-documents bucket
    document_hash text not null check (length(document_hash) = 64), -- Must match document_version SHA-256
    created_at timestamptz not null default now()
);

-- Ensure a signer role can only sign a specific version ONCE
create unique index if not exists idx_electronic_signatures_unique_role_version
on public.electronic_signatures(document_version_id, signer_role);

-- =============================================================================
-- SECTION 3: DOCUMENT SIGNATURE AUDIT EVENTS
-- =============================================================================

create table if not exists public.document_signature_events (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    document_version_id uuid references public.document_versions(id) on delete restrict,
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
    metadata jsonb not null default '{}'::jsonb
);

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

-- Attach set_updated_at trigger if existing function is available
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
-- SECTION 6: INDEXES FOR PERFORMANCE
-- =============================================================================

create index if not exists idx_document_versions_lookup on public.document_versions(organization_id, document_type, document_id);
create index if not exists idx_electronic_signatures_doc on public.electronic_signatures(organization_id, document_id);
create index if not exists idx_electronic_signatures_ver on public.electronic_signatures(document_version_id);
create index if not exists idx_signature_events_lookup on public.document_signature_events(document_id, document_version_id);

create index if not exists idx_service_job_media_job on public.service_job_media(organization_id, service_job_id);
create index if not exists idx_service_job_media_public on public.service_job_media(visible_on_public_site, portfolio_approved) where visible_on_public_site = true and portfolio_approved = true;
create index if not exists idx_service_extra_media_extra on public.service_extra_media(organization_id, service_extra_id);

-- =============================================================================
-- SECTION 7: ROW LEVEL SECURITY & POLICIES (STRICTLY ISOLATED)
-- =============================================================================

alter table public.document_versions enable row level security;
alter table public.electronic_signatures enable row level security;
alter table public.document_signature_events enable row level security;
alter table public.service_job_media enable row level security;
alter table public.service_extra_media enable row level security;

-- Owner / Manager full access to versions and signatures
create policy "Company managers can view document versions"
on public.document_versions for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers can view electronic signatures"
on public.electronic_signatures for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers can view signature events"
on public.document_signature_events for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Media Policies
create policy "Company managers can manage job media"
on public.service_job_media for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company managers can manage extra media"
on public.service_extra_media for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Worker policy (restricted to assigned jobs)
create policy "Assigned workers can view job media"
on public.service_job_media for select
using (public.is_worker_assigned_to_job(service_job_id));

-- Double-Lock Public Portfolio Policy
create policy "Public portfolio can read double-approved media"
on public.service_job_media for select
using (visible_on_public_site = true and portfolio_approved = true);

-- =============================================================================
-- SECTION 8: SECURE CLIENT ACCESS RPC (NO DIRECT TABLE SELECT)
-- =============================================================================

create or replace function public.get_client_job_media(p_job_token text)
returns table (
    id uuid,
    media_type text,
    storage_path text,
    file_name text,
    caption text,
    created_at timestamptz
)
language plpgsql
security definer
as $$
declare
    v_job_id uuid;
begin
    -- Locate job_id via valid token (assuming service_jobs or linked estimates have token validation)
    select sj.id into v_job_id
    from public.service_jobs sj
    join public.estimates e on e.id = sj.estimate_id
    where e.public_token = p_job_token;

    if v_job_id is null then
        return;
    end if;

    return query
    select sjm.id, sjm.media_type, sjm.storage_path, sjm.file_name, sjm.caption, sjm.created_at
    from public.service_job_media sjm
    where sjm.service_job_id = v_job_id
      and sjm.visible_to_client = true;
end;
$$;
