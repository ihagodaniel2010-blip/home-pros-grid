-- 012_homeleadpro_receipts_expenses_center.sql

--------------------------------------------------------------------------------
-- 1. VALIDAÇÃO DE PRÉ-REQUISITOS
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN
        RAISE EXCEPTION 'A funcao public.is_super_admin() nao existe.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role_in_org') THEN
        RAISE EXCEPTION 'A funcao public.get_user_role_in_org() nao existe.';
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 2. ALTERAÇÃO DA TABELA RECEIPTS
--------------------------------------------------------------------------------
ALTER TABLE public.receipts ALTER COLUMN service_job_id DROP NOT NULL;

ALTER TABLE public.receipts
    ADD COLUMN IF NOT EXISTS related_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS expense_category text,
    ADD COLUMN IF NOT EXISTS payment_method text,
    ADD COLUMN IF NOT EXISTS paid_by_name text,
    ADD COLUMN IF NOT EXISTS reimbursable_to_owner boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS bill_to_client boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS client_reimbursement_status text DEFAULT 'not_billable',
    ADD COLUMN IF NOT EXISTS tax_year integer,
    ADD COLUMN IF NOT EXISTS tax_category text,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

DO $$
BEGIN
    ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_expense_category_check;
    ALTER TABLE public.receipts ADD CONSTRAINT receipts_expense_category_check 
        CHECK (expense_category IN ('company_expense', 'job_material', 'client_reimbursable', 'owner_reimbursable', 'partner_reimbursable', 'personal_not_business', 'needs_review'));

    ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_payment_method_check;
    ALTER TABLE public.receipts ADD CONSTRAINT receipts_payment_method_check 
        CHECK (payment_method IN ('card', 'cash', 'zelle', 'venmo', 'check', 'bank_transfer', 'other'));

    ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_client_reimbursement_status_check;
    ALTER TABLE public.receipts ADD CONSTRAINT receipts_client_reimbursement_status_check 
        CHECK (client_reimbursement_status IN ('not_billable', 'pending', 'invoiced', 'paid'));

    ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
    ALTER TABLE public.receipts ADD CONSTRAINT receipts_status_check 
        CHECK (status IN ('active', 'voided', 'deleted'));

    ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_payment_source_check;
    ALTER TABLE public.receipts ADD CONSTRAINT receipts_payment_source_check 
        CHECK (payment_source IN ('company_account', 'company_card', 'owner_personal', 'partner_personal', 'employee_personal', 'customer_paid_direct', 'other'));
        
    ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_reimbursement_status_check;
    ALTER TABLE public.receipts ADD CONSTRAINT receipts_reimbursement_status_check 
        CHECK (reimbursement_status IN ('not_reimbursable', 'pending', 'pending_reimbursement', 'approved', 'paid', 'reimbursed', 'rejected'));
END $$;

--------------------------------------------------------------------------------
-- 3. CRIAR TABELA RECEIPT_FILES
--------------------------------------------------------------------------------
create table if not exists public.receipt_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 4. INDEXES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_receipts_organization_id ON public.receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_receipts_service_job_id ON public.receipts(service_job_id);
CREATE INDEX IF NOT EXISTS idx_receipts_estimate_id ON public.receipts(estimate_id);
CREATE INDEX IF NOT EXISTS idx_receipts_related_lead_id ON public.receipts(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_receipts_expense_category ON public.receipts(expense_category);
CREATE INDEX IF NOT EXISTS idx_receipts_tax_year ON public.receipts(tax_year);
CREATE INDEX IF NOT EXISTS idx_receipts_paid_by_user_id ON public.receipts(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_reimbursement_status ON public.receipts(reimbursement_status);

CREATE INDEX IF NOT EXISTS idx_receipt_files_organization_id ON public.receipt_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_receipt_files_receipt_id ON public.receipt_files(receipt_id);

--------------------------------------------------------------------------------
-- 5. RLS
--------------------------------------------------------------------------------
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin has all privileges on receipts" ON public.receipts;
DROP POLICY IF EXISTS "Company managers can manage receipts" ON public.receipts;
DROP POLICY IF EXISTS "Worker can insert job receipts" ON public.receipts;

DROP POLICY IF EXISTS "Super admin has all privileges on receipt_files" ON public.receipt_files;
DROP POLICY IF EXISTS "Company managers can manage receipt_files" ON public.receipt_files;

CREATE POLICY "Super admin has all privileges on receipts" 
ON public.receipts FOR ALL USING (public.is_super_admin());

CREATE POLICY "Company managers can manage receipts" 
ON public.receipts FOR ALL USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

CREATE POLICY "Super admin has all privileges on receipt_files" 
ON public.receipt_files FOR ALL USING (public.is_super_admin());

CREATE POLICY "Company managers can manage receipt_files" 
ON public.receipt_files FOR ALL USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));
