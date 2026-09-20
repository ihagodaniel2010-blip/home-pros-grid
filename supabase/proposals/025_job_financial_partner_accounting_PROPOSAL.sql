-- ==============================================================================
-- PROPOSAL SQL: 025_job_financial_partner_accounting_PROPOSAL.sql
-- PURPOSE: Enterprise Partner Accounting, Historical Ownership Snapshots, Material Ledger & Refund Control
-- AUTHORIZATION: PROPOSAL ONLY - DO NOT EXECUTE AUTOMATICALLY
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. NORMALIZED PARTNERS TABLE (organization_partners)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  email TEXT CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
  ownership_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (ownership_percentage >= 0.00 AND ownership_percentage <= 100.00),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_partner_org_name UNIQUE (organization_id, name),
  CONSTRAINT uq_partner_org_id UNIQUE (id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_partners_org ON public.organization_partners(organization_id);

-- ------------------------------------------------------------------------------
-- 2. OWNERSHIP VALIDATION TRIGGER (SOMA DOS ATIVOS = 100.00%)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_organization_ownership_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC(5,2);
  v_target_org UUID;
BEGIN
  v_target_org := COALESCE(NEW.organization_id, OLD.organization_id);

  SELECT COALESCE(SUM(ownership_percentage), 0.00)
    INTO v_total
    FROM public.organization_partners
   WHERE organization_id = v_target_org
     AND active = true;

  -- Se existem sócios ativos cadastrados, a soma das frações de propriedade deve ser EXATAMENTE 100.00%
  IF v_total > 0.00 AND v_total <> 100.00 THEN
    RAISE EXCEPTION 'Ownership allocation invalid for Organization %. Active partner percentages sum to % %%, but must equal exactly 100.00 %%.',
      v_target_org, v_total, '%', '%';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_organization_ownership ON public.organization_partners;
CREATE CONSTRAINT TRIGGER trg_validate_organization_ownership
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_partners
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validate_organization_ownership_total();

-- ------------------------------------------------------------------------------
-- 3. EXTEND COMPANY SETTINGS FOR OWNERSHIP MODE & COMPOSITE KEY
-- ------------------------------------------------------------------------------
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS business_ownership_type TEXT DEFAULT 'single_owner'
    CHECK (business_ownership_type IN ('single_owner', 'partnership'));

-- Garantir chave composta para RLS/FKs seguras em receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_receipts_id_org'
  ) THEN
    ALTER TABLE public.receipts ADD CONSTRAINT uq_receipts_id_org UNIQUE (id, organization_id);
  END IF;
END $$;

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS material_responsibility TEXT DEFAULT 'company'
    CHECK (material_responsibility IN ('client', 'company')),
  ADD COLUMN IF NOT EXISTS paid_by_partner_id UUID REFERENCES public.organization_partners(id) ON DELETE RESTRICT;

-- ------------------------------------------------------------------------------
-- 4. HISTORICAL PARTNER EXPENSE ALLOCATIONS (partner_expense_allocations)
-- Preserva snapshot exato no momento em que a despesa pessoal foi lançada
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_expense_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  expense_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  ownership_percentage_snapshot NUMERIC(5,2) NOT NULL CHECK (ownership_percentage_snapshot >= 0.00 AND ownership_percentage_snapshot <= 100.00),
  allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount >= 0.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_partner_alloc_expense_org FOREIGN KEY (expense_id, organization_id)
    REFERENCES public.receipts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_alloc_partner_org FOREIGN KEY (partner_id, organization_id)
    REFERENCES public.organization_partners(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_partner_alloc_expense ON public.partner_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_partner_alloc_partner ON public.partner_expense_allocations(partner_id);

-- ------------------------------------------------------------------------------
-- 5. EXPENSE REFUNDS / MATERIAL RETURNS & OVER-LIMIT PROTECTION (expense_refunds)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  service_job_id UUID REFERENCES public.service_jobs(id) ON DELETE RESTRICT,
  expense_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0.00),
  refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  receipt_storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'voided')),
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_expense_refunds_expense_org FOREIGN KEY (expense_id, organization_id)
    REFERENCES public.receipts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_expense_refunds_job_org FOREIGN KEY (service_job_id, organization_id)
    REFERENCES public.service_jobs(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_expense_refunds_expense ON public.expense_refunds(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_refunds_job ON public.expense_refunds(service_job_id);

-- Trigger de Validação de Limite de Refund (Total Refund <= Expense Amount)
CREATE OR REPLACE FUNCTION public.prevent_excessive_expense_refunds()
RETURNS TRIGGER AS $$
DECLARE
  v_original_amount NUMERIC(12,2);
  v_total_refunded NUMERIC(12,2);
BEGIN
  IF NEW.status = 'posted' THEN
    SELECT amount INTO v_original_amount
      FROM public.receipts
     WHERE id = NEW.expense_id AND organization_id = NEW.organization_id;

    IF v_original_amount IS NULL THEN
      RAISE EXCEPTION 'Target expense % not found in organization %.', NEW.expense_id, NEW.organization_id;
    END IF;

    SELECT COALESCE(SUM(amount), 0.00)
      INTO v_total_refunded
      FROM public.expense_refunds
     WHERE expense_id = NEW.expense_id
       AND status = 'posted'
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF (v_total_refunded + NEW.amount) > v_original_amount THEN
      RAISE EXCEPTION 'Cumulative refunds (%) would exceed original expense amount (%) for expense %.',
        (v_total_refunded + NEW.amount), v_original_amount, NEW.expense_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_excessive_expense_refunds ON public.expense_refunds;
CREATE TRIGGER trg_prevent_excessive_expense_refunds
  BEFORE INSERT OR UPDATE ON public.expense_refunds
  FOR EACH ROW EXECUTE FUNCTION public.prevent_excessive_expense_refunds();

-- ------------------------------------------------------------------------------
-- 6. CLIENT MATERIAL PAYMENT LEDGER (client_material_payments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_material_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  service_job_id UUID NOT NULL,
  material_expense_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0.00),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'cash', 'zelle', 'venmo', 'check', 'bank_transfer', 'other')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'voided')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_client_mat_pay_job_org FOREIGN KEY (service_job_id, organization_id)
    REFERENCES public.service_jobs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_client_mat_pay_exp_org FOREIGN KEY (material_expense_id, organization_id)
    REFERENCES public.receipts(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_client_mat_pay_job ON public.client_material_payments(service_job_id);
CREATE INDEX IF NOT EXISTS idx_client_mat_pay_exp ON public.client_material_payments(material_expense_id);

-- ------------------------------------------------------------------------------
-- 7. PARTNER SETTLEMENTS TABLE (partner_settlements)
-- Transferência financeira REAL entre sócios para liquidar saldos acumulados
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  service_job_id UUID,
  payer_partner_id UUID NOT NULL,
  payee_partner_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0.00),
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'zelle', 'venmo', 'other')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'voided')),
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_different_partners CHECK (payer_partner_id <> payee_partner_id),
  CONSTRAINT fk_settlement_payer_org FOREIGN KEY (payer_partner_id, organization_id)
    REFERENCES public.organization_partners(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_settlement_payee_org FOREIGN KEY (payee_partner_id, organization_id)
    REFERENCES public.organization_partners(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_partner_settlement_org ON public.partner_settlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlement_payer ON public.partner_settlements(payer_partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlement_payee ON public.partner_settlements(payee_partner_id);

-- ------------------------------------------------------------------------------
-- 8. ANULAÇÃO DE HARD DELETE EM TRANSAÇÕES FINANCEIRAS (AUDITABILITY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_financial_hard_deletes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion of financial records (%) is strictly prohibited for compliance & auditing. Mark status as voided instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_no_delete_expense_alloc ON public.partner_expense_allocations;
CREATE TRIGGER trg_no_delete_expense_alloc
  BEFORE DELETE ON public.partner_expense_allocations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_hard_deletes();

DROP TRIGGER IF EXISTS trg_no_delete_expense_refunds ON public.expense_refunds;
CREATE TRIGGER trg_no_delete_expense_refunds
  BEFORE DELETE ON public.expense_refunds
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_hard_deletes();

DROP TRIGGER IF EXISTS trg_no_delete_client_mat_pay ON public.client_material_payments;
CREATE TRIGGER trg_no_delete_client_mat_pay
  BEFORE DELETE ON public.client_material_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_hard_deletes();

DROP TRIGGER IF EXISTS trg_no_delete_partner_settlements ON public.partner_settlements;
CREATE TRIGGER trg_no_delete_partner_settlements
  BEFORE DELETE ON public.partner_settlements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_hard_deletes();

-- ------------------------------------------------------------------------------
-- 9. ROLE-AWARE RLS POLICIES & SECURITY
-- ------------------------------------------------------------------------------
ALTER TABLE public.organization_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_expense_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_material_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;

-- Helper Function para verificar roles autorizadas
CREATE OR REPLACE FUNCTION public.is_org_financial_manager(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_users
     WHERE organization_id = p_org_id
       AND user_id = auth.uid()
       AND role IN ('owner', 'admin', 'contractor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies para organization_partners
CREATE POLICY "Partners Select Policy" ON public.organization_partners
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Partners Admin Write Policy" ON public.organization_partners
  FOR ALL USING (public.is_org_financial_manager(organization_id));

-- Policies para partner_expense_allocations
CREATE POLICY "Expense Allocations Select Policy" ON public.partner_expense_allocations
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Expense Allocations Write Policy" ON public.partner_expense_allocations
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

-- Policies para expense_refunds
CREATE POLICY "Expense Refunds Select Policy" ON public.expense_refunds
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Expense Refunds Write Policy" ON public.expense_refunds
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

CREATE POLICY "Expense Refunds Update Policy" ON public.expense_refunds
  FOR UPDATE USING (public.is_org_financial_manager(organization_id));

-- Policies para client_material_payments
CREATE POLICY "Client Material Payments Select Policy" ON public.client_material_payments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Client Material Payments Write Policy" ON public.client_material_payments
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

-- Policies para partner_settlements
CREATE POLICY "Partner Settlements Select Policy" ON public.partner_settlements
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Partner Settlements Write Policy" ON public.partner_settlements
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

-- ------------------------------------------------------------------------------
-- 10. HARDENED SECURITY DEFINER RPC FOR CLIENT PUBLIC PORTAL MATERIALS
-- Expose strictly client-authorized materials for a valid job public token
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_client_job_materials(p_job_token TEXT)
RETURNS TABLE (
  material_id UUID,
  vendor TEXT,
  description TEXT,
  receipt_date DATE,
  amount NUMERIC(12,2),
  total_paid NUMERIC(12,2),
  payment_status TEXT,
  has_receipt BOOLEAN
) AS $$
DECLARE
  v_job_id UUID;
  v_org_id UUID;
BEGIN
  -- Validar token contra service_jobs ou estimates
  SELECT sj.id, sj.organization_id
    INTO v_job_id, v_org_id
    FROM public.service_jobs sj
    JOIN public.estimates est ON sj.estimate_id = est.id
   WHERE est.public_token = p_job_token;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.id AS material_id,
         r.vendor,
         COALESCE(r.notes, 'Job Material') AS description,
         r.receipt_date,
         r.amount,
         COALESCE(SUM(cmp.amount) FILTER (WHERE cmp.status = 'received'), 0.00) AS total_paid,
         CASE
           WHEN COALESCE(SUM(cmp.amount) FILTER (WHERE cmp.status = 'received'), 0.00) >= r.amount THEN 'paid'
           WHEN COALESCE(SUM(cmp.amount) FILTER (WHERE cmp.status = 'received'), 0.00) > 0 THEN 'partially_paid'
           ELSE 'unpaid'
         END AS payment_status,
         EXISTS (SELECT 1 FROM public.receipt_files rf WHERE rf.receipt_id = r.id) AS has_receipt
    FROM public.receipts r
    LEFT JOIN public.client_material_payments cmp ON r.id = cmp.material_expense_id
   WHERE r.service_job_id = v_job_id
     AND r.organization_id = v_org_id
     AND (r.bill_to_client = true OR r.material_responsibility = 'client')
   GROUP BY r.id, r.vendor, r.notes, r.receipt_date, r.amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ==============================================================================
-- READ-ONLY VERIFICATION SUITE FOR PROPOSAL 025 (EXECUTE MANUALLY AFTER APPLYING)
-- ==============================================================================
/*
SELECT table_name FROM information_schema.tables 
 WHERE table_schema = 'public' 
   AND table_name IN ('organization_partners', 'partner_expense_allocations', 'expense_refunds', 'client_material_payments', 'partner_settlements');

SELECT trigger_name, event_object_table 
  FROM information_schema.triggers 
 WHERE trigger_schema = 'public' 
   AND trigger_name IN ('trg_validate_organization_ownership', 'trg_prevent_excessive_expense_refunds', 'trg_no_delete_partner_settlements');
*/
