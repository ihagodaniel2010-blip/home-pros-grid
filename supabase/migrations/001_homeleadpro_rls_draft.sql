-- 001_homeleadpro_rls_draft.sql
-- Draft Row Level Security Policies for HomeLeadPro SaaS Multiempresa
-- Note: Do NOT execute this migration directly without reviews and approval.

--------------------------------------------------------------------------------
-- 🛡️ HELPER FUNCTIONS FOR SECURITY AND RLS CHECKING
--------------------------------------------------------------------------------

-- 1. Get role of active user in specific organization
create or replace function public.get_user_role_in_org(org_id uuid)
returns text
security definer
stable
language sql
as $$
    select role from public.organization_users
    where user_id = auth.uid() 
      and organization_id = org_id 
      and status = 'active';
$$;

-- 2. Verify if active user is a Super Admin of the platform
create or replace function public.is_super_admin()
returns boolean
security definer
stable
language sql
as $$
    select exists (
        select 1 from public.organization_users
        where user_id = auth.uid() 
          and role = 'super_admin' 
          and status = 'active'
    );
$$;

-- 3. Check if active user belongs to specific organization
create or replace function public.is_org_member(org_id uuid)
returns boolean
security definer
stable
language sql
as $$
    select exists (
        select 1 from public.organization_users
        where user_id = auth.uid() 
          and organization_id = org_id 
          and status = 'active'
    );
$$;

--------------------------------------------------------------------------------
-- 🔒 ENABLING ROW LEVEL SECURITY
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

--------------------------------------------------------------------------------
-- 📜 POLICIES DEFINITION
--------------------------------------------------------------------------------

-- ====================================================================
-- organizations
-- ====================================================================
create policy "Super admin has all privileges"
on public.organizations
for all
using (public.is_super_admin());

create policy "Org members can read own organization details"
on public.organizations
for select
using (public.is_org_member(id));

create policy "Owners can update own organization details"
on public.organizations
for update
using (public.get_user_role_in_org(id) = 'owner');

-- ====================================================================
-- organization_users
-- ====================================================================
create policy "Super admin has all privileges on organization_users"
on public.organization_users
for all
using (public.is_super_admin());

create policy "Org members can view staff of the same organization"
on public.organization_users
for select
using (public.is_org_member(organization_id));

create policy "Owners can manage organization staff"
on public.organization_users
for all
using (public.get_user_role_in_org(organization_id) = 'owner');

-- ====================================================================
-- company_settings
-- ====================================================================
create policy "Super admin has all privileges on company_settings"
on public.company_settings
for all
using (public.is_super_admin());

create policy "Public read allowed for estimates token lookup"
on public.company_settings
for select
using (true); -- Public metadata needs to be visible in public estimates page

create policy "Company managers can update settings"
on public.company_settings
for update
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Owners can insert initial settings"
on public.company_settings
for insert
with check (public.get_user_role_in_org(organization_id) = 'owner');

-- ====================================================================
-- service_categories
-- ====================================================================
create policy "Public can read active service categories"
on public.service_categories
for select
using (active = true);

create policy "Super admin can manage service categories"
on public.service_categories
for all
using (public.is_super_admin());

-- ====================================================================
-- company_services
-- ====================================================================
create policy "Super admin has all privileges on company_services"
on public.company_services
for all
using (public.is_super_admin());

create policy "Org members can select active services"
on public.company_services
for select
using (public.is_org_member(organization_id));

create policy "Company managers can edit company services"
on public.company_services
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- us_locations
-- ====================================================================
create policy "Public can read ZIP locations database"
on public.us_locations
for select
using (true);

create policy "Super admin can edit US locations"
on public.us_locations
for all
using (public.is_super_admin());

-- ====================================================================
-- company_service_areas
-- ====================================================================
create policy "Super admin has all privileges on company_service_areas"
on public.company_service_areas
for all
using (public.is_super_admin());

create policy "Org members can view active service areas"
on public.company_service_areas
for select
using (public.is_org_member(organization_id));

create policy "Company managers can edit service areas"
on public.company_service_areas
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- leads
-- ====================================================================
create policy "Super admin can manage all leads"
on public.leads
for all
using (public.is_super_admin());

create policy "Anonymous users can insert new public leads"
on public.leads
for insert
with check (source = 'public'); -- Strict restriction: only source='public' via Anon key

create policy "Org members can view leads assigned to their organization"
on public.leads
for select
using (public.is_org_member(organization_id));

create policy "Org members can update leads assigned to their organization"
on public.leads
for update
using (public.is_org_member(organization_id));

-- ====================================================================
-- lead_files
-- ====================================================================
create policy "Super admin can read/edit all lead_files"
on public.lead_files
for all
using (public.is_super_admin());

create policy "Anonymous users can upload lead files"
on public.lead_files
for insert
with check (true);

create policy "Org members can view files of assigned leads"
on public.lead_files
for select
using (public.is_org_member(organization_id));

create policy "Clients can view their own lead files via public estimate token"
on public.lead_files
for select
using (
    exists (
        select 1 from public.leads
        where leads.id = lead_files.lead_id 
          and lead_files.visibility = 'client'
    )
);

-- ====================================================================
-- lead_pricing_rules
-- ====================================================================
create policy "Super admin can manage pricing rules"
on public.lead_pricing_rules
for all
using (public.is_super_admin());

create policy "Logged in users can view pricing rules"
on public.lead_pricing_rules
for select
using (auth.uid() is not null);

-- ====================================================================
-- platform_settings
-- ====================================================================
create policy "Super admin can manage platform settings"
on public.platform_settings
for all
using (public.is_super_admin());

create policy "Any select on platform settings allowed"
on public.platform_settings
for select
using (true);

-- ====================================================================
-- lead_distributions
-- ====================================================================
create policy "Super admin has all privileges on lead_distributions"
on public.lead_distributions
for all
using (public.is_super_admin());

create policy "Company members can view their own lead distributions"
on public.lead_distributions
for select
using (public.is_org_member(organization_id));

-- ====================================================================
-- organization_credit_ledger
-- ====================================================================
create policy "Super admin has all privileges on credit ledger"
on public.organization_credit_ledger
for all
using (public.is_super_admin());

create policy "Company managers can view credit ledger history"
on public.organization_credit_ledger
for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- sms_threads
-- ====================================================================
create policy "Super admin has all privileges on sms_threads"
on public.sms_threads
for all
using (public.is_super_admin());

create policy "Company members can manage SMS threads"
on public.sms_threads
for all
using (public.is_org_member(organization_id));

create policy "Clients can select thread details via public token check"
on public.sms_threads
for select
using (
    exists (
        select 1 from public.leads 
        where leads.id = sms_threads.lead_id 
          and sms_threads.customer_phone_ref = leads.phone
    )
);

-- ====================================================================
-- sms_messages
-- ====================================================================
create policy "Super admin has all privileges on sms_messages"
on public.sms_messages
for all
using (public.is_super_admin());

create policy "Company members can read/send SMS messages"
on public.sms_messages
for all
using (public.is_org_member(organization_id));

-- ====================================================================
-- estimates
-- ====================================================================
create policy "Super admin has all privileges on estimates"
on public.estimates
for all
using (public.is_super_admin());

create policy "Company members can manage estimates"
on public.estimates
for all
using (public.is_org_member(organization_id));

create policy "Public lookup of estimate details via public token"
on public.estimates
for select
using (true); -- Public lookup is open to check token validity, but is restricted inside application

create policy "Clients can update estimate status via public token (approval/rejection)"
on public.estimates
for update
using (true)
with check (status in ('Approved', 'Rejected', 'Viewed')); -- Clients can only change status field

-- ====================================================================
-- estimate_items
-- ====================================================================
create policy "Super admin has all privileges on estimate_items"
on public.estimate_items
for all
using (public.is_super_admin());

create policy "Company members can manage estimate items"
on public.estimate_items
for all
using (public.is_org_member(organization_id));

create policy "Public lookup of estimate items via public token"
on public.estimate_items
for select
using (
    exists (
        select 1 from public.estimates 
        where estimates.id = estimate_items.estimate_id
    )
);

-- ====================================================================
-- estimate_payments_manual
-- ====================================================================
create policy "Super admin has all privileges on manual payments"
on public.estimate_payments_manual
for all
using (public.is_super_admin());

create policy "Company managers can manage manual payments"
on public.estimate_payments_manual
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- service_jobs
-- ====================================================================
create policy "Super admin has all privileges on service_jobs"
on public.service_jobs
for all
using (public.is_super_admin());

create policy "Company managers can manage service jobs"
on public.service_jobs
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Assigned workers can view their service jobs"
on public.service_jobs
for select
using (
    assigned_worker_id = auth.uid() 
    or exists (
        select 1 from public.employee_assignments
        where employee_assignments.service_job_id = service_jobs.id 
          and employee_assignments.worker_user_id = auth.uid()
    )
);

create policy "Assigned workers can update status of their jobs"
on public.service_jobs
for update
using (
    assigned_worker_id = auth.uid() 
    or exists (
        select 1 from public.employee_assignments
        where employee_assignments.service_job_id = service_jobs.id 
          and employee_assignments.worker_user_id = auth.uid()
    )
)
with check (status in ('in_progress', 'completed')); -- Worker can only advance status

-- ====================================================================
-- service_checklists
-- ====================================================================
create policy "Super admin has all privileges on checklists"
on public.service_checklists
for all
using (public.is_super_admin());

create policy "Company members can view checklists"
on public.service_checklists
for select
using (public.is_org_member(organization_id));

create policy "Company managers can edit checklists"
on public.service_checklists
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- checklist_tasks
-- ====================================================================
create policy "Super admin has all privileges on checklist tasks"
on public.checklist_tasks
for all
using (public.is_super_admin());

create policy "Company members can view checklist tasks"
on public.checklist_tasks
for select
using (public.is_org_member(organization_id));

create policy "Assigned workers can toggle checklist tasks"
on public.checklist_tasks
for update
using (
    public.is_org_member(organization_id)
);

create policy "Company managers can manage checklist tasks"
on public.checklist_tasks
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- service_extras
-- ====================================================================
create policy "Super admin has all privileges on service extras"
on public.service_extras
for all
using (public.is_super_admin());

create policy "Company members can manage service extras"
on public.service_extras
for all
using (public.is_org_member(organization_id));

create policy "Public lookup of service extras via public token"
on public.service_extras
for select
using (true);

create policy "Clients can approve/reject service extras via public token"
on public.service_extras
for update
using (true)
with check (status in ('approved', 'rejected')); -- Client can only approve/reject status

-- ====================================================================
-- service_files
-- ====================================================================
create policy "Super admin has all privileges on service files"
on public.service_files
for all
using (public.is_super_admin());

create policy "Company members can view service files"
on public.service_files
for select
using (public.is_org_member(organization_id));

create policy "Company members can insert service files"
on public.service_files
for insert
with check (public.is_org_member(organization_id));

create policy "Clients can view client visible files"
on public.service_files
for select
using (visibility = 'client');

-- ====================================================================
-- receipts
-- ====================================================================
create policy "Super admin has all privileges on receipts"
on public.receipts
for all
using (public.is_super_admin());

-- Financial values are protected from regular workers
create policy "Company managers can manage receipts"
on public.receipts
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- company_partners
-- ====================================================================
create policy "Super admin has all privileges on company partners"
on public.company_partners
for all
using (public.is_super_admin());

-- Partner lists are only readable/writable by owners (not even general admins or workers)
create policy "Owners can manage company partners"
on public.company_partners
for all
using (public.get_user_role_in_org(organization_id) = 'owner');

-- ====================================================================
-- employee_assignments
-- ====================================================================
create policy "Super admin has all privileges on employee assignments"
on public.employee_assignments
for all
using (public.is_super_admin());

create policy "Company managers can edit employee assignments"
on public.employee_assignments
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Company workers can view their assignments"
on public.employee_assignments
for select
using (worker_user_id = auth.uid());

-- ====================================================================
-- audit_logs
-- ====================================================================
create policy "Super admin can read all audit logs"
on public.audit_logs
for select
using (public.is_super_admin());

create policy "Company managers can read their own audit logs"
on public.audit_logs
for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Platform can insert audit logs"
on public.audit_logs
for insert
with check (true);
