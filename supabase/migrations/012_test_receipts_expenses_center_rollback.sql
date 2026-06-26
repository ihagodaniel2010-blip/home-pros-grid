BEGIN;

--------------------------------------------------------------------------------
-- 1. APLICAR MUDANÇAS ESTRUTURAIS DENTRO DA TRANSAÇÃO
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

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company managers can manage receipts" ON public.receipts;
CREATE POLICY "Company managers can manage receipts" 
ON public.receipts FOR ALL USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Company managers can manage receipt_files" ON public.receipt_files;
CREATE POLICY "Company managers can manage receipt_files" 
ON public.receipt_files FOR ALL USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

--------------------------------------------------------------------------------
-- 2. DADOS TEMPORÁRIOS E TESTES
--------------------------------------------------------------------------------
DO $$ 
DECLARE
    v_org_a uuid := gen_random_uuid();
    v_org_b uuid := gen_random_uuid();
    v_owner_a uuid := gen_random_uuid();
    v_worker_a uuid := gen_random_uuid();
    v_job_a uuid := gen_random_uuid();
    v_receipt_id uuid;
    v_count integer;
BEGIN
    INSERT INTO auth.users (id, email) VALUES (v_owner_a, 'owner_a@test.com'), (v_worker_a, 'worker_a@test.com');
    
    INSERT INTO public.organizations (id, name, status) VALUES 
        (v_org_a, 'Org A', 'active'),
        (v_org_b, 'Org B', 'active');
    
    INSERT INTO public.organization_users (organization_id, user_id, role, status) VALUES 
        (v_org_a, v_owner_a, 'owner', 'active'),
        (v_org_a, v_worker_a, 'worker', 'active');
        
    INSERT INTO public.service_jobs (id, organization_id, status) VALUES (v_job_a, v_org_a, 'in_progress');

    -------------------------------------------------------
    -- SIMULAR OWNER
    -------------------------------------------------------
    EXECUTE 'SET LOCAL role = authenticated';
    EXECUTE format('SET LOCAL request.jwt.claim.sub = ''%s''', v_owner_a);
    
    -- Owner insere despesa SEM job
    INSERT INTO public.receipts (organization_id, service_job_id, amount, vendor, expense_category, payment_method, payment_source)
    VALUES (v_org_a, NULL, 100.00, 'Home Depot', 'company_expense', 'card', 'company_card')
    RETURNING id INTO v_receipt_id;
    
    IF v_receipt_id IS NULL THEN
        RAISE EXCEPTION 'Owner falhou ao inserir despesa sem job.';
    END IF;

    -- Owner insere despesa COM job
    INSERT INTO public.receipts (organization_id, service_job_id, amount, vendor, expense_category, payment_method, payment_source)
    VALUES (v_org_a, v_job_a, 50.00, 'Lowes', 'job_material', 'card', 'owner_personal');

    -- Owner insere receipt_file
    INSERT INTO public.receipt_files (organization_id, receipt_id, storage_bucket, storage_path, file_name, file_size, uploaded_by)
    VALUES (v_org_a, v_receipt_id, 'receipts', 'path/file.pdf', 'file.pdf', 1024, v_owner_a);

    -- Owner não consegue inserir em outra organizacao
    BEGIN
        INSERT INTO public.receipts (organization_id, amount, vendor, payment_method) 
        VALUES (v_org_b, 10.00, 'Test', 'cash');
        RAISE EXCEPTION 'Owner conseguiu inserir despesa na Empresa B.';
    EXCEPTION WHEN OTHERS THEN
        IF sqlerrm LIKE '%Owner conseguiu inserir%' THEN RAISE; END IF;
    END;

    -------------------------------------------------------
    -- SIMULAR WORKER
    -------------------------------------------------------
    EXECUTE format('SET LOCAL request.jwt.claim.sub = ''%s''', v_worker_a);
    
    -- Worker SELECT retorna 0
    SELECT count(*) INTO v_count FROM public.receipts WHERE organization_id = v_org_a;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Worker conseguiu ler despesas.';
    END IF;
    
    -- Worker INSERT falha
    BEGIN
        INSERT INTO public.receipts (organization_id, amount, vendor, payment_method) 
        VALUES (v_org_a, 10.00, 'Worker', 'cash');
        RAISE EXCEPTION 'Worker conseguiu inserir despesa.';
    EXCEPTION WHEN OTHERS THEN
        IF sqlerrm LIKE '%Worker conseguiu inserir%' THEN RAISE; END IF;
    END;

    EXECUTE 'RESET role';
    EXECUTE 'RESET request.jwt.claim.sub';

    RAISE NOTICE 'Testes concluidos com sucesso.';

EXCEPTION
    WHEN OTHERS THEN
        EXECUTE 'RESET role';
        EXECUTE 'RESET request.jwt.claim.sub';
        RAISE EXCEPTION 'Erro no teste: %', sqlerrm;
END $$;

ROLLBACK;
