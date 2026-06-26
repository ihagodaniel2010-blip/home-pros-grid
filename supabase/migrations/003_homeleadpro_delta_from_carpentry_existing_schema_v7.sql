-- 003_homeleadpro_delta_from_carpentry_existing_schema_v7.sql
-- Delta Migration to safely adapt the existing Carpentry schema to the HomeLeadPro v2 design (Version 7).
-- Note: Do NOT execute this migration directly without reviews and approval.

-- Enable pgcrypto extension for UUID generation if not already active
create extension if not exists pgcrypto;

--------------------------------------------------------------------------------
-- 🛡️ 1. CREATE FUNDAMENTAL MULTI-TENANT TABLES (FIRST)
--------------------------------------------------------------------------------

-- 1. organizations
create table if not exists public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique,
    status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
    is_platform_owner boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. organization_users
create table if not exists public.organization_users (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('super_admin', 'owner', 'admin', 'worker')),
    status text not null default 'active' check (status in ('active', 'inactive', 'invited', 'removed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(organization_id, user_id)
);

-- 3. company_settings
create table if not exists public.company_settings (
    organization_id uuid primary key references public.organizations(id) on delete cascade,
    company_name text,
    logo_url text,
    phone text,
    email text,
    website text,
    address text,
    city text,
    state text,
    zip text,
    license_number text,
    insurance_info text,
    default_tax_rate numeric default 0,
    default_terms text,
    request_reviews boolean default true,
    google_review_link text,
    review_message_template text,
    payment_methods jsonb default '{}'::jsonb,
    sms_templates jsonb default '{}'::jsonb,
    media_settings jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 🛡️ 1.0.1. ENSURE FUNDAMENTAL TABLES HAVE EXPECTED COLUMNS (DEFENSIVE ALTER)
--------------------------------------------------------------------------------

-- public.organizations alterations
alter table public.organizations add column if not exists name text;
alter table public.organizations add column if not exists slug text;
alter table public.organizations add column if not exists status text not null default 'active';
alter table public.organizations add column if not exists is_platform_owner boolean not null default false;
alter table public.organizations add column if not exists created_at timestamptz not null default now();
alter table public.organizations add column if not exists updated_at timestamptz not null default now();

-- public.organization_users alterations
alter table public.organization_users add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.organization_users add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.organization_users add column if not exists role text;
alter table public.organization_users add column if not exists status text not null default 'active';
alter table public.organization_users add column if not exists created_at timestamptz not null default now();
alter table public.organization_users add column if not exists updated_at timestamptz not null default now();

-- public.company_settings alterations
alter table public.company_settings add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.company_settings add column if not exists company_name text;
alter table public.company_settings add column if not exists logo_url text;
alter table public.company_settings add column if not exists phone text;
alter table public.company_settings add column if not exists email text;
alter table public.company_settings add column if not exists website text;
alter table public.company_settings add column if not exists address text;
alter table public.company_settings add column if not exists city text;
alter table public.company_settings add column if not exists state text;
alter table public.company_settings add column if not exists zip text;
alter table public.company_settings add column if not exists license_number text;
alter table public.company_settings add column if not exists insurance_info text;
alter table public.company_settings add column if not exists default_tax_rate numeric default 0;
alter table public.company_settings add column if not exists default_terms text;
alter table public.company_settings add column if not exists request_reviews boolean default true;
alter table public.company_settings add column if not exists google_review_link text;
alter table public.company_settings add column if not exists review_message_template text;
alter table public.company_settings add column if not exists payment_methods jsonb default '{}'::jsonb;
alter table public.company_settings add column if not exists sms_templates jsonb default '{}'::jsonb;
alter table public.company_settings add column if not exists media_settings jsonb default '{}'::jsonb;
alter table public.company_settings add column if not exists created_at timestamptz not null default now();
alter table public.company_settings add column if not exists updated_at timestamptz not null default now();

--------------------------------------------------------------------------------
-- 🛡️ 1.1. CREATE OTHER MISSING TABLES (IF NOT EXISTS)
--------------------------------------------------------------------------------

-- 4. service_categories
create table if not exists public.service_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    parent_id uuid references public.service_categories(id) on delete set null,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 5. company_services
create table if not exists public.company_services (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_category_id uuid not null references public.service_categories(id) on delete cascade,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (organization_id, service_category_id)
);

-- 6. us_locations / zip_codes
create table if not exists public.us_locations (
    id uuid primary key default gen_random_uuid(),
    zip text not null,
    city text not null,
    state text not null,
    state_name text not null,
    county text,
    latitude numeric not null,
    longitude numeric not null,
    created_at timestamptz not null default now()
);

-- 7. company_service_areas
create table if not exists public.company_service_areas (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    mode text not null check (mode in ('zip_list', 'radius', 'city_state')),
    zip text,
    city text,
    state text,
    radius_miles numeric check (radius_miles > 0),
    latitude numeric,
    longitude numeric,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 9. lead_files
create table if not exists public.lead_files (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    file_url text not null,
    storage_path text not null,
    file_type text check (file_type in ('image', 'video', 'pdf', 'document')),
    mime_type text,
    file_size integer,
    title text,
    description text,
    visibility text not null default 'internal' check (visibility in ('internal', 'client', 'public_portfolio')),
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 10. lead_pricing_rules
create table if not exists public.lead_pricing_rules (
    id uuid primary key default gen_random_uuid(),
    service_category_id uuid not null references public.service_categories(id) on delete cascade,
    size_class text not null default 'small' check (size_class in ('small', 'medium', 'large', 'emergency', 'custom')),
    min_quantity numeric not null default 0,
    max_quantity numeric,
    base_price numeric not null check (base_price >= 0),
    urgency_multiplier numeric not null default 1.0,
    region_multiplier numeric not null default 1.0,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 11. platform_settings
create table if not exists public.platform_settings (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    value jsonb not null default '{}'::jsonb,
    description text,
    updated_at timestamptz not null default now()
);

-- 12. lead_distributions (Maps public leads distributed/sold to multiple companies)
create table if not exists public.lead_distributions (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    price_charged numeric not null default 0 check (price_charged >= 0),
    status text not null default 'distributed' check (status in ('distributed', 'charged', 'viewed', 'contacted', 'converted', 'lost')),
    charged_at timestamptz,
    distributed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    unique (lead_id, organization_id) -- Avoid duplicate charges
);

-- 13. organization_credit_ledger
create table if not exists public.organization_credit_ledger (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    amount numeric not null,
    transaction_type text not null check (transaction_type in ('credit_added', 'lead_debit', 'adjustment', 'refund_manual')),
    reference_type text check (reference_type in ('lead_distribution', 'admin_adjustment', 'refund')),
    reference_id uuid,
    balance_after numeric not null check (balance_after >= 0), -- Prevents negative balances
    description text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 14. sms_threads
create table if not exists public.sms_threads (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    estimate_id uuid, -- foreign key resolved via alter below
    organization_id uuid not null references public.organizations(id) on delete cascade,
    customer_phone_ref text not null,
    proxy_phone text not null,
    status text not null default 'active' check (status in ('active', 'archived')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 15. sms_messages
create table if not exists public.sms_messages (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null references public.sms_threads(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    direction text not null check (direction in ('outbound', 'inbound')),
    body text not null,
    provider text not null default 'twilio',
    provider_message_id text,
    status text not null default 'sent' check (status in ('sent', 'delivered', 'failed', 'received')),
    sent_at timestamptz,
    received_at timestamptz,
    created_at timestamptz not null default now()
);

-- 18. estimate_payments_manual
create table if not exists public.estimate_payments_manual (
    id uuid primary key default gen_random_uuid(),
    estimate_id uuid not null references public.estimates(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    amount numeric not null check (amount > 0),
    method text not null check (method in ('zelle', 'venmo', 'cash_app', 'bank_transfer', 'cash', 'check', 'external_card', 'other')),
    payment_date timestamptz not null default now(),
    note text,
    receipt_file_id uuid, -- foreign key resolved via alter below
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 19. service_jobs
create table if not exists public.service_jobs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete set null,
    estimate_id uuid references public.estimates(id) on delete set null,
    status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
    assigned_worker_id uuid references auth.users(id) on delete set null,
    address_released_to_worker boolean not null default false,
    scheduled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 20. service_checklists
create table if not exists public.service_checklists (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_job_id uuid not null references public.service_jobs(id) on delete cascade,
    title text not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 21. checklist_tasks
create table if not exists public.checklist_tasks (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    checklist_id uuid not null references public.service_checklists(id) on delete cascade,
    description text not null,
    is_completed boolean not null default false,
    completed_by uuid references auth.users(id) on delete set null,
    completed_at timestamptz,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 22. service_extras
create table if not exists public.service_extras (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_job_id uuid not null references public.service_jobs(id) on delete cascade,
    estimate_id uuid references public.estimates(id) on delete set null,
    description text not null,
    amount numeric not null check (amount > 0),
    reason text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
    public_token text not null unique,
    approved_at timestamptz,
    rejected_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 23. service_files
create table if not exists public.service_files (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete set null,
    estimate_id uuid references public.estimates(id) on delete set null,
    service_job_id uuid references public.service_jobs(id) on delete set null,
    checklist_task_id uuid references public.checklist_tasks(id) on delete set null,
    service_extra_id uuid references public.service_extras(id) on delete set null,
    receipt_id uuid, -- foreign key resolved via alter below
    storage_path text not null,
    file_url text not null,
    file_type text check (file_type in ('image', 'video', 'pdf', 'document')),
    mime_type text,
    file_size integer,
    title text,
    description text,
    visibility text not null default 'internal' check (visibility in ('internal', 'client', 'public_portfolio')),
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 24. receipts
create table if not exists public.receipts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    service_job_id uuid not null references public.service_jobs(id) on delete cascade,
    estimate_id uuid references public.estimates(id) on delete set null,
    amount numeric not null check (amount > 0),
    vendor text not null,
    receipt_date timestamptz not null default now(),
    paid_by_user_id uuid references auth.users(id) on delete set null,
    payment_source text,
    reimbursement_status text not null default 'not_reimbursable' check (reimbursement_status in ('not_reimbursable', 'reimbursable', 'pending_reimbursement', 'reimbursed')),
    is_material_included boolean not null default false,
    should_split_with_partners boolean not null default false,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 25. company_partners
create table if not exists public.company_partners (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    partner_name text not null,
    user_id uuid references auth.users(id) on delete set null,
    share_percentage numeric not null check (share_percentage > 0 and share_percentage <= 100),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 26. employee_assignments
create table if not exists public.employee_assignments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    worker_user_id uuid not null references auth.users(id) on delete cascade,
    service_job_id uuid not null references public.service_jobs(id) on delete cascade,
    can_view_address boolean not null default false,
    assigned_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (worker_user_id, service_job_id)
);

-- 28. audit_logs
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete set null,
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 🛡️ 1.2. ENSURE PRE-EXISTING TABLES HAVE EXPECTED COLUMNS AND TYPES
--------------------------------------------------------------------------------

-- public.leads alterations
alter table public.leads add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists status text;
alter table public.leads add column if not exists service_category_id uuid references public.service_categories(id) on delete set null;
alter table public.leads add column if not exists urgency text;
alter table public.leads add column if not exists zip text;
alter table public.leads add column if not exists public_token text;

-- Ensure public_token in public.leads is TEXT (handling pre-existing UUID type)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'public_token'
      and data_type <> 'text'
  ) then
    alter table public.leads
    alter column public_token type text
    using public_token::text;
  end if;
end $$;

-- public.estimates alterations
alter table public.estimates add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.estimates add column if not exists status text;
alter table public.estimates add column if not exists public_token text;
alter table public.estimates add column if not exists project_type text;
alter table public.estimates add column if not exists notes text;
alter table public.estimates add column if not exists terms text;
alter table public.estimates add column if not exists valid_until timestamptz;
alter table public.estimates add column if not exists approved_at timestamptz;
alter table public.estimates add column if not exists rejected_at timestamptz;

-- Ensure public_token in public.estimates is TEXT (handling pre-existing UUID type)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimates'
      and column_name = 'public_token'
      and data_type <> 'text'
  ) then
    alter table public.estimates
    alter column public_token type text
    using public_token::text;
  end if;
end $$;

-- public.estimate_items alterations
-- Note: In the future, organization_id should be NOT NULL, but it is kept nullable now for initial compatibility with pre-existing records.
alter table public.estimate_items add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- public.service_extras alterations
alter table public.service_extras add column if not exists public_token text;
alter table public.service_extras add column if not exists reason text;
alter table public.service_extras add column if not exists approved_at timestamptz;
alter table public.service_extras add column if not exists rejected_at timestamptz;

-- Ensure public_token in public.service_extras is TEXT (handling pre-existing UUID type)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_extras'
      and column_name = 'public_token'
      and data_type <> 'text'
  ) then
    alter table public.service_extras
    alter column public_token type text
    using public_token::text;
  end if;
end $$;

-- public.reviews alterations
alter table public.reviews alter column user_id drop not null;
alter table public.reviews add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.reviews add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.reviews add column if not exists service_job_id uuid references public.service_jobs(id) on delete set null;
alter table public.reviews add column if not exists public_approved boolean not null default false;
alter table public.reviews add column if not exists google_redirect_clicked boolean not null default false;
alter table public.reviews add column if not exists customer_name text;
alter table public.reviews add column if not exists comment text;
alter table public.reviews add column if not exists is_hidden boolean not null default false;
alter table public.reviews add column if not exists user_name text;
alter table public.reviews add column if not exists body text;

--------------------------------------------------------------------------------
-- 🛡️ 1.3. DEFINE PUBLIC TOKEN GENERATOR FUNCTION (MOVED UP FOR UPDATES)
--------------------------------------------------------------------------------
create or replace function public.generate_public_token()
returns text language sql as $$
    select encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex');
$$;

--------------------------------------------------------------------------------
-- 🛡️ 1.4. POPULATE MISSING TOKENS FOR SECURITY ISOLATION
--------------------------------------------------------------------------------
update public.leads
set public_token = public.generate_public_token()
where public_token is null or trim(public_token) = '';

update public.estimates
set public_token = public.generate_public_token()
where public_token is null or trim(public_token) = '';

update public.service_extras
set public_token = public.generate_public_token()
where public_token is null or trim(public_token) = '';

--------------------------------------------------------------------------------
-- 🛡️ 1.5. UNIQUE INDEXES FOR PUBLIC TOKENS (FILTERED FOR IDEMPOTENCY)
--------------------------------------------------------------------------------
create unique index if not exists idx_leads_public_token_unique
on public.leads(public_token)
where public_token is not null;

create unique index if not exists idx_estimates_public_token_unique
on public.estimates(public_token)
where public_token is not null;

create unique index if not exists idx_service_extras_public_token_unique
on public.service_extras(public_token)
where public_token is not null;

--------------------------------------------------------------------------------
-- 🛡️ 2. SAFE ADDITION OF FOREIGN KEYS AND CONSTRAINTS (IDEMPOTENT PL/PGSQL)
--------------------------------------------------------------------------------

do $$
begin
    -- Add fk_sms_threads_estimates to sms_threads
    if not exists (select 1 from pg_constraint where conname = 'fk_sms_threads_estimates') then
        alter table public.sms_threads add constraint fk_sms_threads_estimates foreign key (estimate_id) references public.estimates(id) on delete set null;
    end if;

    -- Add fk_payments_files to estimate_payments_manual
    if not exists (select 1 from pg_constraint where conname = 'fk_payments_files') then
        alter table public.estimate_payments_manual add constraint fk_payments_files foreign key (receipt_file_id) references public.service_files(id) on delete set null;
    end if;

    -- Add fk_service_files_receipts to service_files
    if not exists (select 1 from pg_constraint where conname = 'fk_service_files_receipts') then
        alter table public.service_files add constraint fk_service_files_receipts foreign key (receipt_id) references public.receipts(id) on delete set null;
    end if;
end;
$$;

--------------------------------------------------------------------------------
-- 🛡️ 3. INDEXES CREATION (IF NOT EXISTS)
--------------------------------------------------------------------------------
create index if not exists idx_us_locations_zip on public.us_locations(zip);
create index if not exists idx_us_locations_city on public.us_locations(city);
create index if not exists idx_leads_organization_id on public.leads(organization_id);
create index if not exists idx_estimates_organization_id on public.estimates(organization_id);

--------------------------------------------------------------------------------
-- 🔒 4. ENABLING ROW LEVEL SECURITY (IDEMPOTENT)
--------------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_users enable row level security;
alter table public.company_settings enable row level security;
alter table public.service_categories enable row level security;
alter table public.company_services enable row level security;
alter table public.company_service_areas enable row level security;
alter table public.leads enable row level security;
alter table public.lead_files enable row level security;
alter table public.lead_pricing_rules enable row level security;
alter table public.platform_settings enable row level security;
alter table public.lead_distributions enable row level security;
alter table public.organization_credit_ledger enable row level security;
alter table public.sms_threads enable row level security;
alter table public.sms_messages enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;
alter table public.estimate_payments_manual enable row level security;
alter table public.service_jobs enable row level security;
alter table public.service_checklists enable row level security;
alter table public.checklist_tasks enable row level security;
alter table public.service_extras enable row level security;
alter table public.service_files enable row level security;
alter table public.receipts enable row level security;
alter table public.company_partners enable row level security;
alter table public.employee_assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reviews enable row level security;

--------------------------------------------------------------------------------
-- 📜 5. RLS POLICIES (DROP CONTROLADO + RE-CREATE)
--------------------------------------------------------------------------------

-- Helper functions and policies are created via create or replace / drop if exists.
-- We re-apply policies with drop-if-exists checks here.

-- 1. Helper functions
create or replace function public.get_user_role_in_org(org_id uuid)
returns text security definer stable language sql as $$
    select role from public.organization_users
    where user_id = auth.uid() and organization_id = org_id and status = 'active';
$$;

create or replace function public.is_super_admin()
returns boolean security definer stable language sql as $$
    select exists (
        select 1 from public.organization_users
        where user_id = auth.uid() and role = 'super_admin' and status = 'active'
     );
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean security definer stable language sql as $$
    select exists (
        select 1 from public.organization_users
        where user_id = auth.uid() and organization_id = org_id and status = 'active'
    );
$$;

create or replace function public.is_worker_assigned_to_job(p_service_job_id uuid)
returns boolean security definer stable language plpgsql as $$
begin
    return exists (
        select 1 from public.service_jobs
        where id = p_service_job_id 
          and (assigned_worker_id = auth.uid() or exists (
              select 1 from public.employee_assignments
              where service_job_id = p_service_job_id 
                and worker_user_id = auth.uid()
          ))
    );
end;
$$;

create or replace function public.can_worker_access_sms_thread(p_thread_id uuid)
returns boolean security definer stable language plpgsql as $$
begin
    return exists (
        select 1 from public.sms_threads t
        join public.service_jobs sj on (sj.lead_id = t.lead_id or (t.estimate_id is not null and sj.estimate_id = t.estimate_id))
        where t.id = p_thread_id 
          and public.is_worker_assigned_to_job(sj.id)
    );
end;
$$;

-- Clean existing policies (idempotency safety)
drop policy if exists "Super admin has all privileges" on public.organizations;
drop policy if exists "Org members can read own organization details" on public.organizations;
drop policy if exists "Owners can update own organization details" on public.organizations;
drop policy if exists "Super admin has all privileges on organization_users" on public.organization_users;
drop policy if exists "Org members can view staff of the same organization" on public.organization_users;
drop policy if exists "Owners can manage organization staff" on public.organization_users;
drop policy if exists "Super admin has all privileges on company_settings" on public.company_settings;
drop policy if exists "Org members can view company settings" on public.company_settings;
drop policy if exists "Company managers can update settings" on public.company_settings;
drop policy if exists "Owners can insert initial settings" on public.company_settings;
drop policy if exists "Public can read active service categories" on public.service_categories;
drop policy if exists "Super admin can manage service categories" on public.service_categories;
drop policy if exists "Super admin has all privileges on company_services" on public.company_services;
drop policy if exists "Org members can select active services" on public.company_services;
drop policy if exists "Company managers can edit company services" on public.company_services;
drop policy if exists "Public can read ZIP locations database" on public.us_locations;
drop policy if exists "Super admin can edit US locations" on public.us_locations;
drop policy if exists "Super admin has all privileges on company_service_areas" on public.company_service_areas;
drop policy if exists "Org members can view active service areas" on public.company_service_areas;
drop policy if exists "Company managers can edit service areas" on public.company_service_areas;
drop policy if exists "Super admin can manage all leads" on public.leads;
drop policy if exists "Anonymous users can insert new public leads" on public.leads;
drop policy if exists "Company managers can view manual or distributed leads" on public.leads;
drop policy if exists "Company managers can update manual or distributed leads" on public.leads;
drop policy if exists "Super admin can read/edit all lead_files" on public.lead_files;
drop policy if exists "Anonymous users can upload lead files during lead submission" on public.lead_files;
drop policy if exists "Company managers can view files of assigned or distributed leads" on public.lead_files;
drop policy if exists "Super admin can manage pricing rules" on public.lead_pricing_rules;
drop policy if exists "Company managers can view pricing rules" on public.lead_pricing_rules;
drop policy if exists "Super admin can manage platform settings" on public.platform_settings;
drop policy if exists "Company managers can view platform settings" on public.platform_settings;
drop policy if exists "Super admin has all privileges on lead_distributions" on public.lead_distributions;
drop policy if exists "Company managers can view their own lead distributions" on public.lead_distributions;
drop policy if exists "Super admin has all privileges on credit ledger" on public.organization_credit_ledger;
drop policy if exists "Company managers can view credit ledger history" on public.organization_credit_ledger;
drop policy if exists "Super admin has all privileges on sms_threads" on public.sms_threads;
drop policy if exists "Company managers can manage SMS threads" on public.sms_threads;
drop policy if exists "Assigned workers can view SMS threads for their jobs" on public.sms_threads;
drop policy if exists "Super admin has all privileges on sms_messages" on public.sms_messages;
drop policy if exists "Company managers can read/send SMS messages" on public.sms_messages;
drop policy if exists "Assigned workers can view/send messages in threads they can access" on public.sms_messages;
drop policy if exists "Assigned workers can view messages in threads they can access" on public.sms_messages;
drop policy if exists "Assigned workers can send messages in threads they can access" on public.sms_messages;
drop policy if exists "Super admin has all privileges on estimates" on public.estimates;
drop policy if exists "Company managers can manage estimates" on public.estimates;
drop policy if exists "Super admin has all privileges on estimate_items" on public.estimate_items;
drop policy if exists "Company managers can manage estimate items" on public.estimate_items;
drop policy if exists "Super admin has all privileges on manual payments" on public.estimate_payments_manual;
drop policy if exists "Company managers can manage manual payments" on public.estimate_payments_manual;
drop policy if exists "Super admin has all privileges on service_jobs" on public.service_jobs;
drop policy if exists "Company managers can manage service jobs" on public.service_jobs;
drop policy if exists "Assigned workers can view their service jobs" on public.service_jobs;
drop policy if exists "Assigned workers can update status of their jobs" on public.service_jobs;
drop policy if exists "Super admin has all privileges on checklists" on public.service_checklists;
drop policy if exists "Company managers can manage checklists" on public.service_checklists;
drop policy if exists "Assigned workers can view checklists for their jobs" on public.service_checklists;
drop policy if exists "Super admin has all privileges on checklist tasks" on public.checklist_tasks;
drop policy if exists "Company managers can manage checklist tasks" on public.checklist_tasks;
drop policy if exists "Assigned workers can view checklist tasks" on public.checklist_tasks;
drop policy if exists "Assigned workers can toggle checklist tasks" on public.checklist_tasks;
drop policy if exists "Super admin has all privileges on service extras" on public.service_extras;
drop policy if exists "Company managers can manage service extras" on public.service_extras;
drop policy if exists "Assigned workers can view service extras" on public.service_extras;
drop policy if exists "Super admin has all privileges on service files" on public.service_files;
drop policy if exists "Company managers can view and edit service files" on public.service_files;
drop policy if exists "Assigned workers can view service files for their jobs" on public.service_files;
drop policy if exists "Assigned workers can insert service files for their jobs" on public.service_files;
drop policy if exists "Super admin has all privileges on receipts" on public.receipts;
drop policy if exists "Company managers can manage receipts" on public.receipts;
drop policy if exists "Super admin has all privileges on company partners" on public.company_partners;
drop policy if exists "Owners can manage company partners" on public.company_partners;
drop policy if exists "Super admin has all privileges on employee assignments" on public.employee_assignments;
drop policy if exists "Company managers can edit employee assignments" on public.employee_assignments;
drop policy if exists "Company workers can view their assignments" on public.employee_assignments;
drop policy if exists "Super admin has all privileges on reviews" on public.reviews;
drop policy if exists "Public can read approved reviews" on public.reviews;
drop policy if exists "Company managers can view and update reviews" on public.reviews;
drop policy if exists "Super admin can read all audit logs" on public.audit_logs;
drop policy if exists "Company managers can read their own audit logs" on public.audit_logs;
drop policy if exists "Platform can insert audit logs" on public.audit_logs;

-- Re-create all RLS policies (strict v2)
create policy "Super admin has all privileges" on public.organizations for all using (public.is_super_admin());
create policy "Org members can read own organization details" on public.organizations for select using (public.is_org_member(id));
create policy "Owners can update own organization details" on public.organizations for update using (public.get_user_role_in_org(id) = 'owner');

create policy "Super admin has all privileges on organization_users" on public.organization_users for all using (public.is_super_admin());
create policy "Org members can view staff of the same organization" on public.organization_users for select using (public.is_org_member(organization_id));
create policy "Owners can manage organization staff" on public.organization_users for all using (public.get_user_role_in_org(organization_id) = 'owner');

create policy "Super admin has all privileges on company_settings" on public.company_settings for all using (public.is_super_admin());
create policy "Org members can view company settings" on public.company_settings for select using (public.is_org_member(organization_id));
create policy "Company managers can update settings" on public.company_settings for update using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Owners can insert initial settings" on public.company_settings for insert with check (public.get_user_role_in_org(organization_id) = 'owner');

create policy "Public can read active service categories" on public.service_categories for select using (active = true);
create policy "Super admin can manage service categories" on public.service_categories for all using (public.is_super_admin());

create policy "Super admin has all privileges on company_services" on public.company_services for all using (public.is_super_admin());
create policy "Org members can select active services" on public.company_services for select using (public.is_org_member(organization_id));
create policy "Company managers can edit company services" on public.company_services for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Public can read ZIP locations database" on public.us_locations for select using (true);
create policy "Super admin can edit US locations" on public.us_locations for all using (public.is_super_admin());

create policy "Super admin has all privileges on company_service_areas" on public.company_service_areas for all using (public.is_super_admin());
create policy "Org members can view active service areas" on public.company_service_areas for select using (public.is_org_member(organization_id));
create policy "Company managers can edit service areas" on public.company_service_areas for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin can manage all leads" on public.leads for all using (public.is_super_admin());
create policy "Anonymous users can insert new public leads" on public.leads for insert with check (source = 'public' and status = 'new');
create policy "Company managers can view manual or distributed leads" on public.leads for select using (
    (organization_id is not null and public.get_user_role_in_org(organization_id) in ('owner', 'admin'))
    or exists (select 1 from public.lead_distributions where lead_distributions.lead_id = leads.id and public.get_user_role_in_org(lead_distributions.organization_id) in ('owner', 'admin'))
);
create policy "Company managers can update manual or distributed leads" on public.leads for update using (
    (organization_id is not null and public.get_user_role_in_org(organization_id) in ('owner', 'admin'))
    or exists (select 1 from public.lead_distributions where lead_distributions.lead_id = leads.id and public.get_user_role_in_org(lead_distributions.organization_id) in ('owner', 'admin'))
);

create policy "Super admin can read/edit all lead_files" on public.lead_files for all using (public.is_super_admin());
create policy "Anonymous users can upload lead files during lead submission" on public.lead_files for insert with check (exists (select 1 from public.leads where leads.id = lead_files.lead_id and leads.source = 'public'));
create policy "Company managers can view files of assigned or distributed leads" on public.lead_files for select using (
    (organization_id is not null and public.get_user_role_in_org(organization_id) in ('owner', 'admin'))
    or exists (select 1 from public.lead_distributions where lead_distributions.lead_id = lead_files.lead_id and public.get_user_role_in_org(lead_distributions.organization_id) in ('owner', 'admin'))
);

create policy "Super admin can manage pricing rules" on public.lead_pricing_rules for all using (public.is_super_admin());
create policy "Company managers can view pricing rules" on public.lead_pricing_rules for select using (auth.role() = 'authenticated' and exists (select 1 from public.organization_users where user_id = auth.uid() and role in ('owner', 'admin') and status = 'active'));

create policy "Super admin can manage platform settings" on public.platform_settings for all using (public.is_super_admin());
create policy "Company managers can view platform settings" on public.platform_settings for select using (auth.role() = 'authenticated' and exists (select 1 from public.organization_users where user_id = auth.uid() and role in ('owner', 'admin') and status = 'active'));

create policy "Super admin has all privileges on lead_distributions" on public.lead_distributions for all using (public.is_super_admin());
create policy "Company managers can view their own lead distributions" on public.lead_distributions for select using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin has all privileges on credit ledger" on public.organization_credit_ledger for all using (public.is_super_admin());
create policy "Company managers can view credit ledger history" on public.organization_credit_ledger for select using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin has all privileges on sms_threads" on public.sms_threads for all using (public.is_super_admin());
create policy "Company managers can manage SMS threads" on public.sms_threads for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Assigned workers can view SMS threads for their jobs" on public.sms_threads for select using (public.can_worker_access_sms_thread(id));

create policy "Super admin has all privileges on sms_messages" on public.sms_messages for all using (public.is_super_admin());
create policy "Company managers can read/send SMS messages" on public.sms_messages for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Assigned workers can view messages in threads they can access" on public.sms_messages for select using (public.can_worker_access_sms_thread(thread_id));
create policy "Assigned workers can send messages in threads they can access" on public.sms_messages for insert with check (public.can_worker_access_sms_thread(thread_id));

create policy "Super admin has all privileges on estimates" on public.estimates for all using (public.is_super_admin());
create policy "Company managers can manage estimates" on public.estimates for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin has all privileges on estimate_items" on public.estimate_items for all using (public.is_super_admin());
create policy "Company managers can manage estimate items" on public.estimate_items for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin has all privileges on manual payments" on public.estimate_payments_manual for all using (public.is_super_admin());
create policy "Company managers can manage manual payments" on public.estimate_payments_manual for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin has all privileges on service_jobs" on public.service_jobs for all using (public.is_super_admin());
create policy "Company managers can manage service jobs" on public.service_jobs for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Assigned workers can view their service jobs" on public.service_jobs for select using (public.is_worker_assigned_to_job(id));
create policy "Assigned workers can update status of their jobs" on public.service_jobs for update using (public.is_worker_assigned_to_job(id)) with check (status in ('in_progress', 'completed'));

create policy "Super admin has all privileges on checklists" on public.service_checklists for all using (public.is_super_admin());
create policy "Company managers can manage checklists" on public.service_checklists for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Assigned workers can view checklists for their jobs" on public.service_checklists for select using (public.is_worker_assigned_to_job(service_job_id));

create policy "Super admin has all privileges on checklist tasks" on public.checklist_tasks for all using (public.is_super_admin());
create policy "Company managers can manage checklist tasks" on public.checklist_tasks for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Assigned workers can view checklist tasks" on public.checklist_tasks for select using (exists (select 1 from public.service_checklists sc where sc.id = checklist_tasks.checklist_id and public.is_worker_assigned_to_job(sc.service_job_id)));
-- Worker can only toggle tasks belonging to their assigned job. 
-- Note & Limitation for future phase: Worker should only be allowed to modify execution fields (is_completed, completed_by, completed_at). 
-- Since standard Postgres RLS WITH CHECK checks the final row state but does not prevent modifying other columns (e.g. description) if the user role allows it, 
-- a column-level lock trigger or application-level schema validation should be introduced in a future phase to prevent modifying task descriptions.
create policy "Assigned workers can toggle checklist tasks" on public.checklist_tasks for update using (exists (select 1 from public.service_checklists sc where sc.id = checklist_tasks.checklist_id and public.is_worker_assigned_to_job(sc.service_job_id))) with check (is_completed in (true, false));

create policy "Super admin has all privileges on service extras" on public.service_extras for all using (public.is_super_admin());
create policy "Company managers can manage service extras" on public.service_extras for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Assigned workers can view service extras" on public.service_extras for select using (public.is_worker_assigned_to_job(service_job_id));

create policy "Super admin has all privileges on service files" on public.service_files for all using (public.is_super_admin());
create policy "Company managers can view and edit service files" on public.service_files for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Assigned workers can view service files for their jobs" on public.service_files for select using (service_job_id is not null and public.is_worker_assigned_to_job(service_job_id) and receipt_id is null);
create policy "Assigned workers can insert service files for their jobs" on public.service_files for insert with check (service_job_id is not null and public.is_worker_assigned_to_job(service_job_id) and receipt_id is null and visibility != 'public_portfolio');

create policy "Super admin has all privileges on receipts" on public.receipts for all using (public.is_super_admin());
create policy "Company managers can manage receipts" on public.receipts for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin has all privileges on company partners" on public.company_partners for all using (public.is_super_admin());
create policy "Owners can manage company partners" on public.company_partners for all using (public.get_user_role_in_org(organization_id) = 'owner');

create policy "Super admin has all privileges on employee assignments" on public.employee_assignments for all using (public.is_super_admin());
create policy "Company managers can edit employee assignments" on public.employee_assignments for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Company workers can view their assignments" on public.employee_assignments for select using (worker_user_id = auth.uid());

create policy "Super admin has all privileges on reviews" on public.reviews for all using (public.is_super_admin());
create policy "Public can read approved reviews" on public.reviews for select using (is_hidden = false and public_approved = true);
create policy "Company managers can view and update reviews" on public.reviews for all using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Super admin can read all audit logs" on public.audit_logs for select using (public.is_super_admin());
create policy "Company managers can read their own audit logs" on public.audit_logs for select using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));
create policy "Platform can insert audit logs" on public.audit_logs for insert with check (true);

--------------------------------------------------------------------------------
-- 🔄 6. FUNCTIONS & TRIGGERS (DROP CONTROLADO + RE-CREATE)
--------------------------------------------------------------------------------

-- Clean existing triggers to prevent duplicate executions
drop trigger if exists trg_organizations_updated_at on public.organizations;
drop trigger if exists trg_organization_users_updated_at on public.organization_users;
drop trigger if exists trg_company_settings_updated_at on public.company_settings;
drop trigger if exists trg_leads_updated_at on public.leads;
drop trigger if exists trg_estimates_updated_at on public.estimates;
drop trigger if exists trg_service_jobs_updated_at on public.service_jobs;
drop trigger if exists trg_extras_updated_at on public.service_extras;
drop trigger if exists trg_receipts_updated_at on public.receipts;
drop trigger if exists trg_partners_updated_at on public.company_partners;
drop trigger if exists trg_ledger_prevent_negative_balance on public.organization_credit_ledger;
drop trigger if exists trg_item_total_price on public.estimate_items;
drop trigger if exists trg_recalculate_totals on public.estimate_items;
drop trigger if exists trg_partners_percentage_check on public.company_partners;
drop trigger if exists trg_leads_assign_token on public.leads;
drop trigger if exists trg_estimates_assign_token on public.estimates;
drop trigger if exists trg_extras_assign_token on public.service_extras;

-- Re-create all functions and triggers from 002_homeleadpro_functions_triggers_draft_v2.sql

-- 1. General set_updated_at()
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- 2. Ledger and credit balance functions
create or replace function public.get_organization_credit_balance(org_id uuid)
returns numeric security definer stable language plpgsql as $$
declare
    current_balance numeric;
begin
    select coalesce(sum(amount), 0) into current_balance
    from public.organization_credit_ledger
    where organization_id = org_id;
    return current_balance;
end;
$$;

create or replace function public.trg_fn_prevent_negative_balance()
returns trigger security definer language plpgsql as $$
declare
    running_balance numeric;
begin
    select public.get_organization_credit_balance(new.organization_id) into running_balance;
    running_balance := running_balance + new.amount;
    if running_balance < 0 then
        raise exception 'Operação cancelada: Saldo insuficiente. Saldo atual: %, novo saldo solicitado: %', 
            public.get_organization_credit_balance(new.organization_id), running_balance;
    end if;
    new.balance_after := running_balance;
    return new;
end;
$$;

create trigger trg_ledger_prevent_negative_balance
before insert on public.organization_credit_ledger
for each row execute function public.trg_fn_prevent_negative_balance();

-- 3. Estimate line calculations
create or replace function public.trg_fn_calculate_item_total()
returns trigger language plpgsql as $$
begin
    new.total_price := coalesce(new.quantity, 0) * coalesce(new.unit_price, 0);
    return new;
end;
$$;

create trigger trg_item_total_price
before insert or update on public.estimate_items
for each row execute function public.trg_fn_calculate_item_total();

create or replace function public.recalculate_estimate_totals()
returns trigger security definer language plpgsql as $$
declare
    est_id uuid;
    item_subtotal numeric;
    est_tax_rate numeric;
    est_tax_amount numeric;
    est_discount numeric;
    est_total numeric;
    est_paid numeric;
    est_balance numeric;
    est_pay_status text;
begin
    if (TG_OP = 'DELETE') then
        est_id := old.estimate_id;
    else
        est_id := new.estimate_id;
    end if;
    select coalesce(sum(total_price), 0) into item_subtotal from public.estimate_items where estimate_id = est_id;
    select tax_rate, discount_amount, amount_paid into est_tax_rate, est_discount, est_paid from public.estimates where id = est_id;
    est_tax_amount := round((item_subtotal * (coalesce(est_tax_rate, 0) / 100.0)), 2);
    est_total := item_subtotal + est_tax_amount - coalesce(est_discount, 0);
    est_balance := est_total - coalesce(est_paid, 0);
    if est_balance <= 0 then est_pay_status := 'paid';
    elsif est_paid > 0 then est_pay_status := 'partially_paid';
    else est_pay_status := 'unpaid';
    end if;
    update public.estimates
    set subtotal = item_subtotal, tax_amount = est_tax_amount, total_amount = est_total, balance_due = est_balance, payment_status = est_pay_status
    where id = est_id;
    return null;
end;
$$;

create trigger trg_recalculate_totals
after insert or update or delete on public.estimate_items
for each row execute function public.recalculate_estimate_totals();

-- 4. Partner share checks
create or replace function public.validate_partner_share_percentages()
returns trigger security definer language plpgsql as $$
declare
    total_percentage numeric;
begin
    select coalesce(sum(share_percentage), 0) into total_percentage from public.company_partners where organization_id = new.organization_id and active = true and id != new.id;
    total_percentage := total_percentage + new.share_percentage;
    if new.active = true and total_percentage > 100 then
        raise exception 'Configuração societária inválida: A soma das participações dos sócios ativos não pode exceder 100%%. Total calculado: %', total_percentage;
    end if;
    return new;
end;
$$;

create trigger trg_partners_percentage_check
before insert or update on public.company_partners
for each row execute function public.validate_partner_share_percentages();

create or replace function public.validate_partner_shares_complete(org_id uuid)
returns boolean security definer stable language plpgsql as $$
declare
    total_percentage numeric;
begin
    select coalesce(sum(share_percentage), 0) into total_percentage from public.company_partners where organization_id = org_id and active = true;
    return (total_percentage = 100.00);
end;
$$;

-- 5. Secure public tokens trigger helpers
create or replace function public.trg_fn_assign_tokens()
returns trigger language plpgsql as $$
begin
    if new.public_token is null or new.public_token = '' then
        new.public_token := public.generate_public_token();
    end if;
    return new;
end;
$$;

create trigger trg_leads_assign_token before insert on public.leads for each row execute function public.trg_fn_assign_tokens();
create trigger trg_estimates_assign_token before insert on public.estimates for each row execute function public.trg_fn_assign_tokens();
create trigger trg_extras_assign_token before insert on public.service_extras for each row execute function public.trg_fn_assign_tokens();

-- 6. Attach set_updated_at triggers
create trigger trg_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger trg_organization_users_updated_at before update on public.organization_users for each row execute function public.set_updated_at();
create trigger trg_company_settings_updated_at before update on public.company_settings for each row execute function public.set_updated_at();
create trigger trg_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger trg_estimates_updated_at before update on public.estimates for each row execute function public.set_updated_at();
create trigger trg_service_jobs_updated_at before update on public.service_jobs for each row execute function public.set_updated_at();
create trigger trg_extras_updated_at before update on public.service_extras for each row execute function public.set_updated_at();
create trigger trg_receipts_updated_at before update on public.receipts for each row execute function public.set_updated_at();
create trigger trg_partners_updated_at before update on public.company_partners for each row execute function public.set_updated_at();

--------------------------------------------------------------------------------
-- 🛡️ 7. CLIENT-FACING SECURITY DEFINER RPCs
--------------------------------------------------------------------------------

create or replace function public.get_public_estimate(p_token text)
returns json security definer stable language plpgsql as $$
declare
    result json;
begin
    select json_build_object(
        'id', e.id,
        'client_name', e.client_name,
        'client_email', e.client_email,
        'client_phone', e.client_phone,
        'client_address', e.client_address,
        'client_city', e.client_city,
        'client_state', e.client_state,
        'client_zip', e.client_zip,
        'status', e.status,
        'project_type', e.project_type,
        'subtotal', e.subtotal,
        'tax_rate', e.tax_rate,
        'tax_amount', e.tax_amount,
        'discount_amount', e.discount_amount,
        'total_amount', e.total_amount,
        'payment_status', e.payment_status,
        'notes', e.notes,
        'terms', e.terms,
        'valid_until', e.valid_until,
        'approved_at', e.approved_at,
        'rejected_at', e.rejected_at,
        'company', json_build_object(
            'company_name', cs.company_name,
            'logo_url', cs.logo_url,
            'phone', cs.phone,
            'email', cs.email,
            'website', cs.website
        )
    ) into result
    from public.estimates e
    left join public.company_settings cs on cs.organization_id = e.organization_id
    where e.public_token = p_token;
    if result is null then raise exception 'Orçamento não encontrado ou token inválido.'; end if;
    return result;
end;
$$;

create or replace function public.get_public_estimate_items(p_token text)
returns table (
    id uuid, description text, quantity numeric, unit_price numeric, total_price numeric, sort_order integer
) security definer stable language plpgsql as $$
begin
    if not exists (select 1 from public.estimates where public_token = p_token) then
        raise exception 'Token inválido.';
    end if;
    return query
    select ei.id, ei.description, ei.quantity, ei.unit_price, ei.total_price, ei.sort_order
    from public.estimate_items ei join public.estimates e on e.id = ei.estimate_id
    where e.public_token = p_token order by ei.sort_order asc;
end;
$$;

create or replace function public.get_public_estimate_files(p_token text)
returns table (
    id uuid, storage_path text, file_url text, file_type text, mime_type text, file_size integer, title text, description text, created_at timestamptz
) security definer stable language plpgsql as $$
begin
    if not exists (select 1 from public.estimates where public_token = p_token) then
        raise exception 'Token inválido.';
    end if;
    return query
    select sf.id, sf.storage_path, sf.file_url, sf.file_type, sf.mime_type, sf.file_size, sf.title, sf.description, sf.created_at
    from public.service_files sf join public.estimates e on e.id = sf.estimate_id
    where e.public_token = p_token and sf.visibility = 'client';
end;
$$;

create or replace function public.approve_public_estimate(p_token text)
returns boolean security definer language plpgsql as $$
declare
    v_est_record record;
begin
    select id, organization_id, status into v_est_record from public.estimates where public_token = p_token;
    if v_est_record.id is null then raise exception 'Orçamento não encontrado.'; end if;
    if v_est_record.status not in ('draft', 'sent', 'viewed') then raise exception 'Status inválido (%).', v_est_record.status; end if;
    update public.estimates set status = 'approved', approved_at = now() where id = v_est_record.id;
    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (v_est_record.organization_id, 'client_approved', 'estimate', v_est_record.id, jsonb_build_object('token', p_token));
    return true;
end;
$$;

create or replace function public.reject_public_estimate(p_token text)
returns boolean security definer language plpgsql as $$
declare
    v_est_record record;
begin
    select id, organization_id, status into v_est_record from public.estimates where public_token = p_token;
    if v_est_record.id is null then raise exception 'Orçamento não encontrado.'; end if;
    if v_est_record.status not in ('draft', 'sent', 'viewed') then raise exception 'Status inválido (%).', v_est_record.status; end if;
    update public.estimates set status = 'rejected', rejected_at = now() where id = v_est_record.id;
    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (v_est_record.organization_id, 'client_rejected', 'estimate', v_est_record.id, jsonb_build_object('token', p_token));
    return true;
end;
$$;

create or replace function public.get_public_service_extra(p_token text)
returns json security definer stable language plpgsql as $$
declare
    result json;
begin
    select json_build_object(
        'id', se.id, 'description', se.description, 'amount', se.amount, 'reason', se.reason, 'status', se.status, 'approved_at', se.approved_at, 'rejected_at', se.rejected_at,
        'company', json_build_object('company_name', cs.company_name, 'phone', cs.phone, 'email', cs.email)
    ) into result from public.service_extras se left join public.company_settings cs on cs.organization_id = se.organization_id
    where se.public_token = p_token;
    if result is null then raise exception 'Custo extra não encontrado.'; end if;
    return result;
end;
$$;

create or replace function public.respond_public_service_extra(p_token text, p_response text)
returns boolean security definer language plpgsql as $$
declare
    v_extra_record record;
begin
    if p_response not in ('approved', 'rejected') then raise exception 'Resposta inválida.'; end if;
    select id, organization_id, status into v_extra_record from public.service_extras where public_token = p_token;
    if v_extra_record.id is null then raise exception 'Custo extra não encontrado.'; end if;
    if v_extra_record.status != 'pending' then raise exception 'Custo extra já processado.'; end if;
    
    if p_response = 'approved' then
        update public.service_extras set status = 'approved', approved_at = now() where id = v_extra_record.id;
    else
        update public.service_extras set status = 'rejected', rejected_at = now() where id = v_extra_record.id;
    end if;
    
    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (v_extra_record.organization_id, 'client_responded_extra', 'service_extra', v_extra_record.id, jsonb_build_object('response', p_response, 'token', p_token));
    return true;
end;
$$;

create or replace function public.get_public_reviews()
returns table (id uuid, user_name text, user_avatar_url text, rating integer, body text, created_at timestamptz)
security definer stable language plpgsql as $$
begin
    return query select r.id, r.user_name, r.user_avatar_url, r.rating, r.body, r.created_at
    from public.reviews r where r.is_hidden = false and r.public_approved = true order by r.created_at desc;
end;
$$;

create or replace function public.submit_public_review(p_organization_id uuid, p_user_name text, p_rating integer, p_body text, p_lead_id uuid default null)
returns uuid security definer language plpgsql as $$
declare
    v_new_id uuid;
begin
    if p_rating < 1 or p_rating > 5 then raise exception 'Avaliação inválida.'; end if;
    insert into public.reviews (organization_id, user_name, rating, body, lead_id, public_approved, is_hidden)
    values (p_organization_id, p_user_name, p_rating, p_body, p_lead_id, false, false)
    returning id into v_new_id;
    return v_new_id;
end;
$$;

--------------------------------------------------------------------------------
-- 🤖 8. AUTOMATED SYSTEM LEAD ROUTING & MATCHING ENGINE
--------------------------------------------------------------------------------

create or replace function public.distribute_public_lead_to_matching_companies(p_lead_id uuid)
returns integer security definer language plpgsql as $$
declare
    v_lead_record record;
    v_pricing_record record;
    v_price numeric;
    v_max_distributions integer := 3;
    v_distributed_count integer := 0;
    v_matching_org record;
    v_ledger_id uuid;
begin
    select id, zip, service_category_id, urgency, source, status into v_lead_record from public.leads where id = p_lead_id;
    if v_lead_record.id is null then raise exception 'Lead não encontrado.'; end if;
    if v_lead_record.source != 'public' then raise exception 'Apenas leads públicos podem ser distribuídos pelo sistema.'; end if;
    select coalesce((value->>'max_distributions')::integer, 3) into v_max_distributions from public.platform_settings where key = 'lead_distribution_settings';
    
    select base_price, urgency_multiplier, region_multiplier into v_pricing_record from public.lead_pricing_rules where service_category_id = v_lead_record.service_category_id and active = true limit 1;
    if v_pricing_record.base_price is not null then
        v_price := v_pricing_record.base_price * coalesce(v_pricing_record.urgency_multiplier, 1.0) * coalesce(v_pricing_record.region_multiplier, 1.0);
    else
        v_price := 25.00;
    end if;

    for v_matching_org in 
        select o.id as org_id, o.name as org_name
        from public.organizations o
        join public.company_services cs on cs.organization_id = o.id
        join public.company_service_areas csa on csa.organization_id = o.id
        where o.status = 'active'
          and cs.service_category_id = v_lead_record.service_category_id
          and cs.active = true
          and csa.active = true
          and ((csa.mode = 'zip_list' and csa.zip = v_lead_record.zip) or (csa.mode = 'city_state' and csa.zip = v_lead_record.zip))
          and public.get_organization_credit_balance(o.id) >= v_price
          and not exists (select 1 from public.lead_distributions ld where ld.lead_id = p_lead_id and ld.organization_id = o.id)
        order by public.get_organization_credit_balance(o.id) desc
    loop
        select count(*) into v_distributed_count from public.lead_distributions where lead_id = p_lead_id;
        exit when v_distributed_count >= v_max_distributions;

        begin
            insert into public.lead_distributions (lead_id, organization_id, price_charged, status)
            values (p_lead_id, v_matching_org.org_id, v_price, 'distributed');

            insert into public.organization_credit_ledger (organization_id, amount, transaction_type, reference_type, reference_id, description)
            values (v_matching_org.org_id, -v_price, 'lead_debit', 'lead_distribution', p_lead_id, 'Débito automático por lead: ' || p_lead_id);

            insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
            values (v_matching_org.org_id, 'lead_distributed_charge', 'lead', p_lead_id, jsonb_build_object('price', v_price));

            v_distributed_count := v_distributed_count + 1;
        exception when others then
            raise warning 'Falha ao distribuir lead % para a empresa %: %', p_lead_id, v_matching_org.org_name, SQLERRM;
        end;
    end loop;

    if v_distributed_count > 0 then
        update public.leads set status = 'distributed' where id = p_lead_id;
    end if;
    return v_distributed_count;
end;
$$;
