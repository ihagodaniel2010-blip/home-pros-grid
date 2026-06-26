-- 000_homeleadpro_schema_draft_v2.sql
-- Draft Schema for HomeLeadPro SaaS Multiempresa (Version 2 - Corrected)
-- Note: Do NOT execute this migration directly without reviews and approval.

-- Enable pgcrypto extension for UUID generation if not already active
create extension if not exists pgcrypto;

-- 1. organizations
create table if not exists public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
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
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, user_id)
);

-- 3. company_settings
create table if not exists public.company_settings (
    organization_id uuid primary key references public.organizations(id) on delete cascade,
    company_name text not null,
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
    default_tax_rate numeric not null default 0 check (default_tax_rate >= 0),
    default_terms text,
    request_reviews boolean not null default true,
    google_review_link text,
    review_message_template text,
    payment_methods jsonb not null default '{}'::jsonb,
    sms_templates jsonb not null default '{}'::jsonb,
    media_settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

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

-- 8. leads (organization_id is NULL for public leads distributed to multiple companies)
create table if not exists public.leads (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete set null, -- NULL for public leads, set for manual leads
    source text not null default 'public' check (source in ('public', 'manual')),
    full_name text not null,
    email text not null,
    phone text not null,
    phone_masked text, -- Masked phone via Twilio Proxy
    address text,
    city text,
    state text,
    zip text not null,
    selected_service text not null,
    selected_service_option text,
    service_category_id uuid references public.service_categories(id) on delete set null,
    details text,
    description text,
    urgency text not null default 'standard' check (urgency in ('standard', 'medium', 'high', 'emergency')),
    preferred_contact_method text default 'email' check (preferred_contact_method in ('email', 'phone', 'text')),
    status text not null default 'new' check (status in ('new', 'distributed', 'contacted', 'converted', 'lost', 'rejected', 'closed')),
    owner_notes text,
    public_token text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
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
    unique (lead_id, organization_id) -- Avoid duplicate charges for the same lead and organization
);

-- 13. organization_credit_ledger
create table if not exists public.organization_credit_ledger (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    amount numeric not null,
    transaction_type text not null check (transaction_type in ('credit_added', 'lead_debit', 'adjustment', 'refund_manual')),
    reference_type text check (reference_type in ('lead_distribution', 'admin_adjustment', 'refund')),
    reference_id uuid, -- Reference key (ex: lead_distributions.id)
    balance_after numeric not null check (balance_after >= 0), -- Prevents negative balances at schema constraint level
    description text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 14. sms_threads
create table if not exists public.sms_threads (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    estimate_id uuid, -- references public.estimates (resolved via alter later to prevent cycle)
    organization_id uuid not null references public.organizations(id) on delete cascade,
    customer_phone_ref text not null, -- masked or reference ID to client phone
    proxy_phone text not null, -- platform phone number
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

-- 16. estimates
create table if not exists public.estimates (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete set null,
    client_name text not null,
    client_email text,
    client_phone text,
    client_address text,
    client_city text,
    client_state text,
    client_zip text,
    status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'approved', 'rejected', 'paid', 'cancelled')),
    project_type text,
    subtotal numeric not null default 0 check (subtotal >= 0),
    tax_rate numeric not null default 0 check (tax_rate >= 0),
    tax_amount numeric not null default 0 check (tax_amount >= 0),
    discount_amount numeric not null default 0 check (discount_amount >= 0),
    total_amount numeric not null default 0 check (total_amount >= 0),
    amount_paid numeric not null default 0 check (amount_paid >= 0),
    balance_due numeric not null default 0,
    payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partially_paid', 'paid')),
    public_token text not null unique,
    notes text,
    terms text,
    valid_until timestamptz,
    approved_at timestamptz,
    rejected_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Alter sms_threads to add foreign key to estimates now that estimates table is created
alter table public.sms_threads add constraint fk_sms_threads_estimates foreign key (estimate_id) references public.estimates(id) on delete set null;

-- 17. estimate_items
create table if not exists public.estimate_items (
    id uuid primary key default gen_random_uuid(),
    estimate_id uuid not null references public.estimates(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    description text not null,
    quantity numeric not null default 1 check (quantity > 0),
    unit_price numeric not null default 0 check (unit_price >= 0),
    total_price numeric not null default 0 check (total_price >= 0),
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
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
    receipt_file_id uuid, -- references public.service_files later to prevent dependency cycle
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
    receipt_id uuid, -- references public.receipts later
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

-- Alter estimate_payments_manual to add foreign key to service_files now that it is created
alter table public.estimate_payments_manual add constraint fk_payments_files foreign key (receipt_file_id) references public.service_files(id) on delete set null;

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

-- Alter service_files to add foreign key to receipts
alter table public.service_files add constraint fk_service_files_receipts foreign key (receipt_id) references public.receipts(id) on delete set null;

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

-- 27. reviews (PRESERVING compatibility with existing fields from reviewsService.ts)
-- We DO NOT rename user_name and body. We just add new columns to the reviews table.
-- Also, make user_id nullable to allow public anonymous submissions without authentication.
alter table public.reviews alter column user_id drop not null;
alter table public.reviews add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.reviews add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.reviews add column if not exists service_job_id uuid references public.service_jobs(id) on delete set null;
alter table public.reviews add column if not exists public_approved boolean not null default false;
alter table public.reviews add column if not exists google_redirect_clicked boolean not null default false;
alter table public.reviews add column if not exists customer_name text; -- Optional fields for future use
alter table public.reviews add column if not exists comment text;         -- Optional fields for future use

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
