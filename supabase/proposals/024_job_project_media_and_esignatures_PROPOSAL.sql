-- =============================================================================
-- PROPOSAL ONLY — DO NOT EXECUTE AUTOMATICALLY
-- 024_job_project_media_and_esignatures_PROPOSAL.sql
-- Proposed Schema Migration for Phase 10.7B E-Signatures, Media & Audit Trails
-- =============================================================================

-- 1. Table: public.electronic_signatures
-- Stores immutable audit logs for electronic signatures across Estimates & Change Orders
create table if not exists public.electronic_signatures (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    document_type text not null check (document_type in ('estimate', 'change_order', 'contract')),
    document_id uuid not null,
    public_token text,
    signer_name text not null,
    signer_email text not null,
    signed_at timestamptz not null default now(),
    ip_address text,
    user_agent text,
    consent_version text not null default 'v1.0_UETA_ESIGN',
    document_hash text,
    signature_storage_path text,
    created_at timestamptz not null default now()
);

-- 2. Table: public.service_extra_media
-- Stores photo & video attachments for Change Orders
create table if not exists public.service_extra_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_extra_id uuid not null references public.service_extras(id) on delete cascade,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null,
    caption text,
    file_size_bytes bigint,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 3. Table: public.service_job_media
-- Stores project photos and videos linked to active jobs with granular visibility controls
create table if not exists public.service_job_media (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_job_id uuid not null references public.service_jobs(id) on delete cascade,
    media_type text not null check (media_type in ('image', 'video')),
    storage_path text not null,
    caption text,
    visible_to_client boolean not null default true,
    visible_on_public_site boolean not null default false,
    portfolio_approved boolean not null default false,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. Storage Buckets Proposal:
-- insert into storage.buckets (id, name, public) values ('signatures', 'signatures', false);
-- insert into storage.buckets (id, name, public) values ('job-media', 'job-media', false);

-- 5. RLS Policies Strategy:
alter table public.electronic_signatures enable row level security;
alter table public.service_extra_media enable row level security;
alter table public.service_job_media enable row level security;

-- Company admins access electronic signatures
create policy "Company managers can view electronic signatures"
on public.electronic_signatures for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Company managers control job media
create policy "Company managers can manage job media"
on public.service_job_media for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- Clients can view job media marked visible_to_client
create policy "Clients can view client-visible job media"
on public.service_job_media for select
using (visible_to_client = true);

-- Public portfolio page can read approved portfolio photos
create policy "Public portfolio can read approved media"
on public.service_job_media for select
using (visible_on_public_site = true and portfolio_approved = true);
