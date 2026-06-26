-- 001_homeleadpro_rls_draft_v2.sql
-- Draft Row Level Security Policies for HomeLeadPro SaaS Multiempresa (Version 2)
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
alter table public.reviews enable row level security;

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
-- company_settings (SENSITIVE - No using(true)!)
-- ====================================================================
create policy "Super admin has all privileges on company_settings"
on public.company_settings
for all
using (public.is_super_admin());

create policy "Org members can view company settings"
on public.company_settings
for select
using (public.is_org_member(organization_id));

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
-- leads (SENSITIVE - No using(true) / Worker blocked from general)
-- ====================================================================
create policy "Super admin can manage all leads"
on public.leads
for all
using (public.is_super_admin());

create policy "Anonymous users can insert new public leads"
on public.leads
for insert
with check (source = 'public' and status = 'new'); -- Only source='public' status='new' via Anon key

create policy "Company managers can view manual or distributed leads"
on public.leads
for select
using (
    -- Manual leads created by or assigned directly to the organization
    (organization_id is not null and public.get_user_role_in_org(organization_id) in ('owner', 'admin'))
    -- OR public leads distributed to the organization
    or exists (
        select 1 from public.lead_distributions
        where lead_distributions.lead_id = leads.id
          and public.get_user_role_in_org(lead_distributions.organization_id) in ('owner', 'admin')
    )
);

create policy "Company managers can update manual or distributed leads"
on public.leads
for update
using (
    (organization_id is not null and public.get_user_role_in_org(organization_id) in ('owner', 'admin'))
    or exists (
        select 1 from public.lead_distributions
        where lead_distributions.lead_id = leads.id
          and public.get_user_role_in_org(lead_distributions.organization_id) in ('owner', 'admin')
    )
);

-- ====================================================================
-- lead_files (SENSITIVE - No using(true))
-- ====================================================================
create policy "Super admin can read/edit all lead_files"
on public.lead_files
for all
using (public.is_super_admin());

create policy "Anonymous users can upload lead files during lead submission"
on public.lead_files
for insert
with check (
    exists (
        select 1 from public.leads
        where leads.id = lead_files.lead_id
          and leads.source = 'public'
    )
);

create policy "Company managers can view files of assigned or distributed leads"
on public.lead_files
for select
using (
    (organization_id is not null and public.get_user_role_in_org(organization_id) in ('owner', 'admin'))
    or exists (
        select 1 from public.lead_distributions
        where lead_distributions.lead_id = lead_files.lead_id
          and public.get_user_role_in_org(lead_distributions.organization_id) in ('owner', 'admin')
    )
);

-- ====================================================================
-- lead_pricing_rules
-- ====================================================================
create policy "Super admin can manage pricing rules"
on public.lead_pricing_rules
for all
using (public.is_super_admin());

create policy "Company managers can view pricing rules"
on public.lead_pricing_rules
for select
using (
    auth.role() = 'authenticated' 
    and exists (
        select 1 from public.organization_users
        where user_id = auth.uid() 
          and role in ('owner', 'admin')
          and status = 'active'
    )
);

-- ====================================================================
-- platform_settings
-- ====================================================================
create policy "Super admin can manage platform settings"
on public.platform_settings
for all
using (public.is_super_admin());

create policy "Company managers can view platform settings"
on public.platform_settings
for select
using (
    auth.role() = 'authenticated' 
    and exists (
        select 1 from public.organization_users
        where user_id = auth.uid() 
          and role in ('owner', 'admin')
          and status = 'active'
    )
);

-- ====================================================================
-- lead_distributions
-- ====================================================================
create policy "Super admin has all privileges on lead_distributions"
on public.lead_distributions
for all
using (public.is_super_admin());

create policy "Company managers can view their own lead distributions"
on public.lead_distributions
for select
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- organization_credit_ledger (SENSITIVE - No workers!)
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
-- sms_threads (SENSITIVE - Workers only see assigned)
-- ====================================================================
create policy "Super admin has all privileges on sms_threads"
on public.sms_threads
for all
using (public.is_super_admin());

create policy "Company managers can manage SMS threads"
on public.sms_threads
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Assigned workers can view SMS threads for their jobs"
on public.sms_threads
for select
using (
    exists (
        select 1 from public.service_jobs
        where service_jobs.lead_id = sms_threads.lead_id
          and (
              service_jobs.assigned_worker_id = auth.uid()
              or exists (
                  select 1 from public.employee_assignments
                  where employee_assignments.service_job_id = service_jobs.id
                    and employee_assignments.worker_user_id = auth.uid()
              )
          )
    )
);

-- ====================================================================
-- sms_messages (SENSITIVE - Workers only see assigned)
-- ====================================================================
create policy "Super admin has all privileges on sms_messages"
on public.sms_messages
for all
using (public.is_super_admin());

create policy "Company managers can read/send SMS messages"
on public.sms_messages
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Assigned workers can view/send messages in threads they can access"
on public.sms_messages
for all
using (
    exists (
        select 1 from public.sms_threads
        where sms_threads.id = sms_messages.thread_id
    )
);

-- ====================================================================
-- estimates (SENSITIVE - No using(true) / Workers blocked!)
-- ====================================================================
create policy "Super admin has all privileges on estimates"
on public.estimates
for all
using (public.is_super_admin());

create policy "Company managers can manage estimates"
on public.estimates
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- estimate_items (SENSITIVE - No using(true) / Workers blocked!)
-- ====================================================================
create policy "Super admin has all privileges on estimate_items"
on public.estimate_items
for all
using (public.is_super_admin());

create policy "Company managers can manage estimate items"
on public.estimate_items
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- estimate_payments_manual (SENSITIVE - Workers blocked!)
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
-- service_jobs (Workers can only view assigned, managers see all)
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
with check (status in ('in_progress', 'completed'));

-- ====================================================================
-- service_checklists
-- ====================================================================
create policy "Super admin has all privileges on checklists"
on public.service_checklists
for all
using (public.is_super_admin());

create policy "Company managers can manage checklists"
on public.service_checklists
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Assigned workers can view checklists for their jobs"
on public.service_checklists
for select
using (
    exists (
        select 1 from public.service_jobs
        where service_jobs.id = service_checklists.service_job_id
    )
);

-- ====================================================================
-- checklist_tasks
-- ====================================================================
create policy "Super admin has all privileges on checklist tasks"
on public.checklist_tasks
for all
using (public.is_super_admin());

create policy "Company managers can manage checklist tasks"
on public.checklist_tasks
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Assigned workers can view checklist tasks"
on public.checklist_tasks
for select
using (
    exists (
        select 1 from public.service_checklists
        where service_checklists.id = checklist_tasks.checklist_id
    )
);

create policy "Assigned workers can toggle checklist tasks"
on public.checklist_tasks
for update
using (
    exists (
        select 1 from public.service_checklists
        where service_checklists.id = checklist_tasks.checklist_id
    )
)
with check (is_completed in (true, false));

-- ====================================================================
-- service_extras (SENSITIVE - No using(true) / Workers cannot update)
-- ====================================================================
create policy "Super admin has all privileges on service extras"
on public.service_extras
for all
using (public.is_super_admin());

create policy "Company managers can manage service extras"
on public.service_extras
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Assigned workers can view service extras"
on public.service_extras
for select
using (
    exists (
        select 1 from public.service_jobs
        where service_jobs.id = service_extras.service_job_id
    )
);

-- ====================================================================
-- service_files (SENSITIVE - No using(true) / Client visible filtered)
-- ====================================================================
create policy "Super admin has all privileges on service files"
on public.service_files
for all
using (public.is_super_admin());

create policy "Company managers can view and edit service files"
on public.service_files
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Assigned workers can view service files for their jobs"
on public.service_files
for select
using (
    exists (
        select 1 from public.service_jobs
        where service_jobs.id = service_files.service_job_id
    )
);

create policy "Assigned workers can insert service files for their jobs"
on public.service_files
for insert
with check (
    exists (
        select 1 from public.service_jobs
        where service_jobs.id = service_files.service_job_id
    )
);

-- ====================================================================
-- receipts (SENSITIVE - Workers blocked!)
-- ====================================================================
create policy "Super admin has all privileges on receipts"
on public.receipts
for all
using (public.is_super_admin());

create policy "Company managers can manage receipts"
on public.receipts
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

-- ====================================================================
-- company_partners (SENSITIVE - Block general admins/workers, Owner only!)
-- ====================================================================
create policy "Super admin has all privileges on company partners"
on public.company_partners
for all
using (public.is_super_admin());

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
-- reviews (SENSITIVE - Checked approvals!)
-- ====================================================================
create policy "Super admin has all privileges on reviews"
on public.reviews
for all
using (public.is_super_admin());

create policy "Public can read approved reviews"
on public.reviews
for select
using (is_hidden = false and public_approved = true);

create policy "Company managers can view and update reviews"
on public.reviews
for all
using (public.get_user_role_in_org(organization_id) in ('owner', 'admin'));

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
