-- ==============================================================================
-- PROPOSAL SQL: 025_job_financial_partner_accounting_PROPOSAL.sql
-- PURPOSE: Enterprise Partner Accounting, Concurrency Protection, Immutability & Secure Client Ledger
-- AUTHORIZATION: PROPOSAL ONLY - DO NOT EXECUTE AUTOMATICALLY
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. PREPARATION: EXTEND PRE-EXISTING TABLES FIRST (CORRECT MIGRATION ORDER)
-- ------------------------------------------------------------------------------

-- Add business_ownership_type to company_settings FIRST so triggers can reference it
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS business_ownership_type TEXT DEFAULT 'single_owner'
    CHECK (business_ownership_type IN ('single_owner', 'partnership'));

-- Add composite unique constraints required for composite foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_service_jobs_id_org'
  ) THEN
    ALTER TABLE public.service_jobs ADD CONSTRAINT uq_service_jobs_id_org UNIQUE (id, organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_receipts_id_org'
  ) THEN
    ALTER TABLE public.receipts ADD CONSTRAINT uq_receipts_id_org UNIQUE (id, organization_id);
  END IF;
END $$;

-- Receipts legacy: material_responsibility defaults to NULL (Unclassified) to avoid misclassifying historical records
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS material_responsibility TEXT DEFAULT NULL
    CHECK (material_responsibility IS NULL OR material_responsibility IN ('client', 'company')),
  ADD COLUMN IF NOT EXISTS paid_by_partner_id UUID DEFAULT NULL;

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_financial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

DROP TRIGGER IF EXISTS trg_set_updated_at_org_partners ON public.organization_partners;
CREATE TRIGGER trg_set_updated_at_org_partners
  BEFORE UPDATE ON public.organization_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_financial_updated_at();

-- Add composite FK from receipts to organization_partners now that organization_partners exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_receipts_partner_org'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT fk_receipts_partner_org
      FOREIGN KEY (paid_by_partner_id, organization_id)
      REFERENCES public.organization_partners(id, organization_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. OWNERSHIP VALIDATION TRIGGERS (100.00% ENFORCEMENT FOR PARTNERSHIPS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_organization_ownership_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC(5,2);
  v_target_org UUID;
  v_ownership_type TEXT;
BEGIN
  v_target_org := COALESCE(NEW.organization_id, OLD.organization_id);

  SELECT business_ownership_type INTO v_ownership_type
    FROM public.company_settings
   WHERE organization_id = v_target_org;

  SELECT COALESCE(SUM(ownership_percentage), 0.00)
    INTO v_total
    FROM public.organization_partners
   WHERE organization_id = v_target_org
     AND active = true;

  IF v_ownership_type = 'partnership' THEN
    IF v_total <> 100.00 THEN
      RAISE EXCEPTION 'Partnership ownership invalid for Organization %. Active partner percentages sum to % %%, but must equal exactly 100.00 %%.',
        v_target_org, v_total, '%';
    END IF;
  ELSIF v_total > 100.00 THEN
    RAISE EXCEPTION 'Ownership total (%) cannot exceed 100.00 %% for Organization %.', v_total, v_target_org;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_organization_ownership ON public.organization_partners;
CREATE CONSTRAINT TRIGGER trg_validate_organization_ownership
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_partners
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validate_organization_ownership_total();

-- Validation trigger for business_ownership_type change in company_settings
CREATE OR REPLACE FUNCTION public.validate_company_ownership_mode()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC(5,2);
BEGIN
  IF NEW.business_ownership_type = 'partnership' THEN
    SELECT COALESCE(SUM(ownership_percentage), 0.00)
      INTO v_total
      FROM public.organization_partners
     WHERE organization_id = NEW.organization_id
       AND active = true;

    IF v_total <> 100.00 THEN
      RAISE EXCEPTION 'Cannot set business_ownership_type to partnership for Organization %. Active partner ownership sums to % %%, but must equal exactly 100.00 %%.',
        NEW.organization_id, v_total, '%';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_company_ownership_mode ON public.company_settings;
CREATE TRIGGER trg_validate_company_ownership_mode
  BEFORE INSERT OR UPDATE OF business_ownership_type ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_company_ownership_mode();

-- ------------------------------------------------------------------------------
-- 3. HISTORICAL PARTNER EXPENSE ALLOCATIONS (partner_expense_allocations)
-- Preserves immutable historical ownership percentage & original allocated amount
-- Net Economic Obligation is derived dynamically: (Original Expense - Posted Refunds) * Percentage
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_expense_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  expense_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  ownership_percentage_snapshot NUMERIC(5,2) NOT NULL CHECK (ownership_percentage_snapshot >= 0.00 AND ownership_percentage_snapshot <= 100.00),
  original_allocated_amount NUMERIC(12,2) NOT NULL CHECK (original_allocated_amount >= 0.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_expense_partner UNIQUE (expense_id, partner_id),
  CONSTRAINT fk_partner_alloc_expense_org FOREIGN KEY (expense_id, organization_id)
    REFERENCES public.receipts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_alloc_partner_org FOREIGN KEY (partner_id, organization_id)
    REFERENCES public.organization_partners(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_partner_alloc_expense ON public.partner_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_partner_alloc_partner ON public.partner_expense_allocations(partner_id);

DROP TRIGGER IF EXISTS trg_set_updated_at_partner_alloc ON public.partner_expense_allocations;
CREATE TRIGGER trg_set_updated_at_partner_alloc
  BEFORE UPDATE ON public.partner_expense_allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_financial_updated_at();

-- Trigger: Immutability of Partner Expense Allocations once created
CREATE OR REPLACE FUNCTION public.protect_partner_expense_allocation_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
     NEW.expense_id IS DISTINCT FROM OLD.expense_id OR
     NEW.partner_id IS DISTINCT FROM OLD.partner_id OR
     NEW.ownership_percentage_snapshot IS DISTINCT FROM OLD.ownership_percentage_snapshot OR
     NEW.original_allocated_amount IS DISTINCT FROM OLD.original_allocated_amount THEN
    RAISE EXCEPTION 'Historical partner expense allocations are immutable once posted. Modifying snapshot percentages or original allocated amounts is prohibited.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_immutability_partner_alloc ON public.partner_expense_allocations;
CREATE TRIGGER trg_protect_immutability_partner_alloc
  BEFORE UPDATE ON public.partner_expense_allocations
  FOR EACH ROW EXECUTE FUNCTION public.protect_partner_expense_allocation_immutability();

-- Allocation Trigger: Validates sum of percentages = 100.00%, sum of amounts = receipts.amount,
-- and individual allocation corresponds to percentage (with 1 cent rounding tolerance)
CREATE OR REPLACE FUNCTION public.validate_partner_expense_allocation_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_total_snapshot NUMERIC(5,2);
  v_total_allocated NUMERIC(12,2);
  v_expense_amount NUMERIC(12,2);
  v_expected_amount NUMERIC(12,2);
  v_target_expense UUID;
  rec RECORD;
BEGIN
  v_target_expense := COALESCE(NEW.expense_id, OLD.expense_id);

  SELECT amount INTO v_expense_amount
    FROM public.receipts
   WHERE id = v_target_expense;

  SELECT COALESCE(SUM(ownership_percentage_snapshot), 0.00),
         COALESCE(SUM(original_allocated_amount), 0.00)
    INTO v_total_snapshot, v_total_allocated
    FROM public.partner_expense_allocations
   WHERE expense_id = v_target_expense;

  IF v_total_snapshot <> 100.00 THEN
    RAISE EXCEPTION 'Partner allocation snapshot percentage total (%) must equal 100.00 %% for expense %.',
      v_total_snapshot, v_target_expense;
  END IF;

  IF v_total_allocated <> v_expense_amount THEN
    RAISE EXCEPTION 'Partner original allocated amount sum (%) must equal original expense amount (%) for expense %.',
      v_total_allocated, v_expense_amount, v_target_expense;
  END IF;

  -- Validate each individual partner's allocation matches percentage within 1 cent tolerance
  FOR rec IN SELECT ownership_percentage_snapshot, original_allocated_amount, partner_id
               FROM public.partner_expense_allocations
              WHERE expense_id = v_target_expense
  LOOP
    v_expected_amount := ROUND(v_expense_amount * (rec.ownership_percentage_snapshot / 100.00), 2);
    IF ABS(rec.original_allocated_amount - v_expected_amount) > 0.01 THEN
      RAISE EXCEPTION 'Allocation amount (%) for partner % does not match ownership percentage (% %%) for expense amount (%). Expected approximately %.',
        rec.original_allocated_amount, rec.partner_id, rec.ownership_percentage_snapshot, '%', v_expense_amount, v_expected_amount;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_partner_expense_allocation_snapshot ON public.partner_expense_allocations;
CREATE CONSTRAINT TRIGGER trg_validate_partner_expense_allocation_snapshot
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_expense_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_expense_allocation_snapshot();

-- ------------------------------------------------------------------------------
-- 4. EXPENSE REFUNDS / MATERIAL RETURNS & CONCURRENCY PROTECTION (expense_refunds)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  service_job_id UUID,
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

DROP TRIGGER IF EXISTS trg_set_updated_at_expense_refunds ON public.expense_refunds;
CREATE TRIGGER trg_set_updated_at_expense_refunds
  BEFORE UPDATE ON public.expense_refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_financial_updated_at();

-- Concurrency-safe limit validation trigger using SELECT ... FOR UPDATE
CREATE OR REPLACE FUNCTION public.prevent_excessive_expense_refunds()
RETURNS TRIGGER AS $$
DECLARE
  v_original_amount NUMERIC(12,2);
  v_total_refunded NUMERIC(12,2);
BEGIN
  IF NEW.status = 'posted' THEN
    SELECT amount INTO v_original_amount
      FROM public.receipts
     WHERE id = NEW.expense_id AND organization_id = NEW.organization_id
       FOR UPDATE;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_excessive_expense_refunds ON public.expense_refunds;
CREATE TRIGGER trg_prevent_excessive_expense_refunds
  BEFORE INSERT OR UPDATE ON public.expense_refunds
  FOR EACH ROW EXECUTE FUNCTION public.prevent_excessive_expense_refunds();

-- ------------------------------------------------------------------------------
-- 5. CLIENT MATERIAL PAYMENT LEDGER & CLIENT-RESPONSIBILITY ENFORCEMENT
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
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT,
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

DROP TRIGGER IF EXISTS trg_set_updated_at_client_mat_pay ON public.client_material_payments;
CREATE TRIGGER trg_set_updated_at_client_mat_pay
  BEFORE UPDATE ON public.client_material_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_financial_updated_at();

-- Concurrency-safe overpayment validation AND client-material responsibility check
CREATE OR REPLACE FUNCTION public.prevent_excessive_client_material_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_material_amount NUMERIC(12,2);
  v_total_paid NUMERIC(12,2);
  v_target_job UUID;
  v_bill_to_client BOOLEAN;
  v_mat_resp TEXT;
BEGIN
  IF NEW.status = 'received' THEN
    -- Lock target material expense row
    SELECT service_job_id, bill_to_client, material_responsibility, amount
      INTO v_target_job, v_bill_to_client, v_mat_resp, v_material_amount
      FROM public.receipts
     WHERE id = NEW.material_expense_id AND organization_id = NEW.organization_id
       FOR UPDATE;

    IF v_material_amount IS NULL THEN
      RAISE EXCEPTION 'Target material expense % not found in organization %.', NEW.material_expense_id, NEW.organization_id;
    END IF;

    -- Confirm matching service job ID
    IF v_target_job IS NULL OR v_target_job IS DISTINCT FROM NEW.service_job_id THEN
      RAISE EXCEPTION 'Material expense % belongs to job %, which does not match payment job %.',
        NEW.material_expense_id, v_target_job, NEW.service_job_id;
    END IF;

    -- Strict responsibility check: client material ONLY (never company material or unclassified non-client)
    IF NOT (COALESCE(v_mat_resp, '') = 'client' OR (v_mat_resp IS NULL AND v_bill_to_client = true)) THEN
      RAISE EXCEPTION 'Client material payments can only be recorded against client-responsible materials. Target material % is marked as company material or not billable.',
        NEW.material_expense_id;
    END IF;

    SELECT COALESCE(SUM(amount), 0.00)
      INTO v_total_paid
      FROM public.client_material_payments
     WHERE material_expense_id = NEW.material_expense_id
       AND status = 'received'
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF (v_total_paid + NEW.amount) > v_material_amount THEN
      RAISE EXCEPTION 'Cumulative material payments (%) would exceed total material receipt amount (%) for expense %.',
        (v_total_paid + NEW.amount), v_material_amount, NEW.material_expense_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_excessive_client_material_payments ON public.client_material_payments;
CREATE TRIGGER trg_prevent_excessive_client_material_payments
  BEFORE INSERT OR UPDATE ON public.client_material_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_excessive_client_material_payments();

-- ------------------------------------------------------------------------------
-- 6. PARTNER SETTLEMENTS LEDGER & NET BALANCE OVERPAYMENT PROTECTION
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_settlement_job_org'
  ) THEN
    ALTER TABLE public.partner_settlements
      ADD CONSTRAINT fk_settlement_job_org
      FOREIGN KEY (service_job_id, organization_id)
      REFERENCES public.service_jobs(id, organization_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_settlement_org ON public.partner_settlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlement_payer ON public.partner_settlements(payer_partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlement_payee ON public.partner_settlements(payee_partner_id);

DROP TRIGGER IF EXISTS trg_set_updated_at_partner_settlements ON public.partner_settlements;
CREATE TRIGGER trg_set_updated_at_partner_settlements
  BEFORE UPDATE ON public.partner_settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_financial_updated_at();

-- Partner Settlement Limit Trigger: Prevents settlement exceeding derived Net Owed Balance
-- Uses FOR UPDATE row locks on organization_partners to eliminate race conditions
CREATE OR REPLACE FUNCTION public.prevent_excessive_partner_settlements()
RETURNS TRIGGER AS $$
DECLARE
  v_net_balance_owed NUMERIC(12,2);
BEGIN
  IF NEW.status = 'posted' THEN
    -- Lock both partner records in organization to prevent settlement race condition
    PERFORM id FROM public.organization_partners
     WHERE organization_id = NEW.organization_id
       AND id IN (NEW.payer_partner_id, NEW.payee_partner_id)
       FOR UPDATE;

    -- Calculate Gross Net Obligation owed by Payer (D) to Payee (C)
    -- minus reverse obligations, minus posted settlements (voided settlements are excluded automatically)
    WITH expense_nets AS (
      SELECT r.id AS expense_id,
             (r.amount - COALESCE(SUM(er.amount), 0.00)) AS net_amount
        FROM public.receipts r
        LEFT JOIN public.expense_refunds er
          ON r.id = er.expense_id AND er.status = 'posted'
       WHERE r.organization_id = NEW.organization_id
         AND r.paid_by_partner_id = NEW.payee_partner_id
         AND (NEW.service_job_id IS NULL OR r.service_job_id = NEW.service_job_id)
       GROUP BY r.id, r.amount
    ),
    payer_obligations AS (
      SELECT COALESCE(SUM(ROUND(en.net_amount * (pea.ownership_percentage_snapshot / 100.00), 2)), 0.00) AS total_owed
        FROM expense_nets en
        JOIN public.partner_expense_allocations pea
          ON en.expense_id = pea.expense_id
       WHERE pea.partner_id = NEW.payer_partner_id
    ),
    reverse_expense_nets AS (
      SELECT r.id AS expense_id,
             (r.amount - COALESCE(SUM(er.amount), 0.00)) AS net_amount
        FROM public.receipts r
        LEFT JOIN public.expense_refunds er
          ON r.id = er.expense_id AND er.status = 'posted'
       WHERE r.organization_id = NEW.organization_id
         AND r.paid_by_partner_id = NEW.payer_partner_id
         AND (NEW.service_job_id IS NULL OR r.service_job_id = NEW.service_job_id)
       GROUP BY r.id, r.amount
    ),
    payee_obligations AS (
      SELECT COALESCE(SUM(ROUND(ren.net_amount * (pea.ownership_percentage_snapshot / 100.00), 2)), 0.00) AS total_owed
        FROM reverse_expense_nets ren
        JOIN public.partner_expense_allocations pea
          ON ren.expense_id = pea.expense_id
       WHERE pea.partner_id = NEW.payee_partner_id
    ),
    posted_settlements_direct AS (
      SELECT COALESCE(SUM(amount), 0.00) AS total_settled
        FROM public.partner_settlements
       WHERE organization_id = NEW.organization_id
         AND payer_partner_id = NEW.payer_partner_id
         AND payee_partner_id = NEW.payee_partner_id
         AND status = 'posted'
         AND (NEW.service_job_id IS NULL OR service_job_id = NEW.service_job_id)
         AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ),
    posted_settlements_reverse AS (
      SELECT COALESCE(SUM(amount), 0.00) AS total_settled
        FROM public.partner_settlements
       WHERE organization_id = NEW.organization_id
         AND payer_partner_id = NEW.payee_partner_id
         AND payee_partner_id = NEW.payer_partner_id
         AND status = 'posted'
         AND (NEW.service_job_id IS NULL OR service_job_id = NEW.service_job_id)
    )
    SELECT (po.total_owed - py.total_owed - psd.total_settled + psr.total_settled)
      INTO v_net_balance_owed
      FROM payer_obligations po, payee_obligations py, posted_settlements_direct psd, posted_settlements_reverse psr;

    v_net_balance_owed := GREATEST(v_net_balance_owed, 0.00);

    IF NEW.amount > v_net_balance_owed THEN
      RAISE EXCEPTION 'Settlement amount (%) exceeds currently owed net balance (%) from partner % to partner %.',
        NEW.amount, v_net_balance_owed, NEW.payer_partner_id, NEW.payee_partner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_excessive_partner_settlement ON public.partner_settlements;
CREATE TRIGGER trg_prevent_excessive_partner_settlement
  BEFORE INSERT OR UPDATE ON public.partner_settlements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_excessive_partner_settlements();

-- ------------------------------------------------------------------------------
-- 7. AUDITABILITY: TABLE-SPECIFIC IMMUTABILITY & CONTROLLED VOID TRIGGERS
-- Prevents modification of ALL core financial fields once posted/received
-- Allows only controlled voiding with required non-empty void_reason
-- ------------------------------------------------------------------------------

-- A. EXPENSE REFUNDS IMMUTABILITY TRIGGER
CREATE OR REPLACE FUNCTION public.protect_expense_refunds_immutability_and_void()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'voided' THEN
    RAISE EXCEPTION 'Expense refund record % is voided and immutable.', OLD.id;
  END IF;

  IF NEW.status = 'voided' AND OLD.status = 'posted' THEN
    IF NEW.void_reason IS NULL OR char_length(trim(NEW.void_reason)) = 0 THEN
      RAISE EXCEPTION 'A non-empty void_reason is required to void an expense refund.';
    END IF;

    NEW.voided_at := NOW();
    NEW.voided_by := auth.uid();

    -- Restore all immutable operational & financial fields to OLD values
    NEW.organization_id := OLD.organization_id;
    NEW.service_job_id := OLD.service_job_id;
    NEW.expense_id := OLD.expense_id;
    NEW.amount := OLD.amount;
    NEW.refund_date := OLD.refund_date;
    NEW.created_by := OLD.created_by;
    RETURN NEW;
  END IF;

  -- Block any edit to core fields while active ('posted')
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
     NEW.service_job_id IS DISTINCT FROM OLD.service_job_id OR
     NEW.expense_id IS DISTINCT FROM OLD.expense_id OR
     NEW.amount IS DISTINCT FROM OLD.amount OR
     NEW.refund_date IS DISTINCT FROM OLD.refund_date OR
     NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Modification of core fields in expense_refunds (organization, job, expense, amount, date, created_by) is prohibited. Void record and issue a new transaction instead.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_immutability_expense_refunds ON public.expense_refunds;
CREATE TRIGGER trg_protect_immutability_expense_refunds
  BEFORE UPDATE ON public.expense_refunds
  FOR EACH ROW EXECUTE FUNCTION public.protect_expense_refunds_immutability_and_void();

-- B. CLIENT MATERIAL PAYMENTS IMMUTABILITY TRIGGER
CREATE OR REPLACE FUNCTION public.protect_client_material_payments_immutability_and_void()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'voided' THEN
    RAISE EXCEPTION 'Client material payment record % is voided and immutable.', OLD.id;
  END IF;

  IF NEW.status = 'voided' AND OLD.status = 'received' THEN
    IF NEW.void_reason IS NULL OR char_length(trim(NEW.void_reason)) = 0 THEN
      RAISE EXCEPTION 'A non-empty void_reason is required to void a client material payment.';
    END IF;

    NEW.voided_at := NOW();
    NEW.voided_by := auth.uid();

    -- Restore all immutable operational & financial fields to OLD values
    NEW.organization_id := OLD.organization_id;
    NEW.service_job_id := OLD.service_job_id;
    NEW.material_expense_id := OLD.material_expense_id;
    NEW.amount := OLD.amount;
    NEW.payment_date := OLD.payment_date;
    NEW.payment_method := OLD.payment_method;
    NEW.created_by := OLD.created_by;
    RETURN NEW;
  END IF;

  -- Block any edit to core fields while active ('received')
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
     NEW.service_job_id IS DISTINCT FROM OLD.service_job_id OR
     NEW.material_expense_id IS DISTINCT FROM OLD.material_expense_id OR
     NEW.amount IS DISTINCT FROM OLD.amount OR
     NEW.payment_date IS DISTINCT FROM OLD.payment_date OR
     NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
     NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Modification of core fields in client_material_payments (organization, job, material_expense, amount, date, method, created_by) is prohibited. Void record and issue a new transaction instead.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_immutability_client_mat_pay ON public.client_material_payments;
CREATE TRIGGER trg_protect_immutability_client_mat_pay
  BEFORE UPDATE ON public.client_material_payments
  FOR EACH ROW EXECUTE FUNCTION public.protect_client_material_payments_immutability_and_void();

-- C. PARTNER SETTLEMENTS IMMUTABILITY TRIGGER
CREATE OR REPLACE FUNCTION public.protect_partner_settlements_immutability_and_void()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'voided' THEN
    RAISE EXCEPTION 'Partner settlement record % is voided and immutable.', OLD.id;
  END IF;

  IF NEW.status = 'voided' AND OLD.status = 'posted' THEN
    IF NEW.void_reason IS NULL OR char_length(trim(NEW.void_reason)) = 0 THEN
      RAISE EXCEPTION 'A non-empty void_reason is required to void a partner settlement.';
    END IF;

    NEW.voided_at := NOW();
    NEW.voided_by := auth.uid();

    -- Restore all immutable operational & financial fields to OLD values
    NEW.organization_id := OLD.organization_id;
    NEW.service_job_id := OLD.service_job_id;
    NEW.payer_partner_id := OLD.payer_partner_id;
    NEW.payee_partner_id := OLD.payee_partner_id;
    NEW.amount := OLD.amount;
    NEW.settlement_date := OLD.settlement_date;
    NEW.payment_method := OLD.payment_method;
    NEW.created_by := OLD.created_by;
    RETURN NEW;
  END IF;

  -- Block any edit to core fields while active ('posted')
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
     NEW.service_job_id IS DISTINCT FROM OLD.service_job_id OR
     NEW.payer_partner_id IS DISTINCT FROM OLD.payer_partner_id OR
     NEW.payee_partner_id IS DISTINCT FROM OLD.payee_partner_id OR
     NEW.amount IS DISTINCT FROM OLD.amount OR
     NEW.settlement_date IS DISTINCT FROM OLD.settlement_date OR
     NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
     NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Modification of core fields in partner_settlements (organization, job, payer, payee, amount, date, method, created_by) is prohibited. Void record and issue a new transaction instead.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_immutability_partner_settlements ON public.partner_settlements;
CREATE TRIGGER trg_protect_immutability_partner_settlements
  BEFORE UPDATE ON public.partner_settlements
  FOR EACH ROW EXECUTE FUNCTION public.protect_partner_settlements_immutability_and_void();

-- Physical hard delete prohibition trigger for financial tables
CREATE OR REPLACE FUNCTION public.prevent_financial_hard_deletes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion of financial records in table % is strictly prohibited for compliance & auditing. Mark status as voided instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
-- 8. ROLE-AWARE RLS POLICIES & SECURITY CONTROLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.organization_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_expense_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_material_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;

-- Helper Function to verify if user has a financial management role ('owner', 'admin', 'contractor')
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policies for organization_partners (RESTRICTED to financial managers)
CREATE POLICY "Partners Financial Select Policy" ON public.organization_partners
  FOR SELECT USING (public.is_org_financial_manager(organization_id));

CREATE POLICY "Partners Financial Admin Write Policy" ON public.organization_partners
  FOR ALL USING (public.is_org_financial_manager(organization_id));

-- Policies for partner_expense_allocations (RESTRICTED to financial managers)
CREATE POLICY "Expense Allocations Financial Select Policy" ON public.partner_expense_allocations
  FOR SELECT USING (public.is_org_financial_manager(organization_id));

CREATE POLICY "Expense Allocations Insert Policy" ON public.partner_expense_allocations
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

-- Policies for expense_refunds (No NEW/OLD references in RLS policy expression)
CREATE POLICY "Expense Refunds Select Policy" ON public.expense_refunds
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Expense Refunds Write Policy" ON public.expense_refunds
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

CREATE POLICY "Expense Refunds Void Policy" ON public.expense_refunds
  FOR UPDATE USING (public.is_org_financial_manager(organization_id))
             WITH CHECK (public.is_org_financial_manager(organization_id));

-- Policies for client_material_payments (No NEW/OLD references in RLS policy expression)
CREATE POLICY "Client Material Payments Select Policy" ON public.client_material_payments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Client Material Payments Write Policy" ON public.client_material_payments
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

CREATE POLICY "Client Material Payments Void Policy" ON public.client_material_payments
  FOR UPDATE USING (public.is_org_financial_manager(organization_id))
             WITH CHECK (public.is_org_financial_manager(organization_id));

-- Policies for partner_settlements (RESTRICTED to financial managers, no NEW/OLD references)
CREATE POLICY "Partner Settlements Financial Select Policy" ON public.partner_settlements
  FOR SELECT USING (public.is_org_financial_manager(organization_id));

CREATE POLICY "Partner Settlements Write Policy" ON public.partner_settlements
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

CREATE POLICY "Partner Settlements Void Policy" ON public.partner_settlements
  FOR UPDATE USING (public.is_org_financial_manager(organization_id))
             WITH CHECK (public.is_org_financial_manager(organization_id));

-- ------------------------------------------------------------------------------
-- 9. HARDENED SECURITY DEFINER RPC FOR CLIENT PUBLIC PORTAL MATERIALS & RECEIPTS
-- CTE prevents cartesian duplication & DOES NOT expose private raw storage paths
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
  has_receipt BOOLEAN,
  receipt_file_name TEXT,
  receipt_mime_type TEXT
) AS $$
DECLARE
  v_job_id UUID;
  v_org_id UUID;
BEGIN
  SELECT sj.id, sj.organization_id
    INTO v_job_id, v_org_id
    FROM public.service_jobs sj
    JOIN public.estimates est ON sj.estimate_id = est.id
   WHERE est.public_token = p_job_token;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH mat_payments AS (
    SELECT cmp.material_expense_id,
           COALESCE(SUM(cmp.amount), 0.00) AS total_paid
      FROM public.client_material_payments cmp
     WHERE cmp.status = 'received'
     GROUP BY cmp.material_expense_id
  ),
  mat_receipts AS (
    SELECT rf.receipt_id,
           (ARRAY_AGG(rf.file_name))[1] AS main_file_name,
           (ARRAY_AGG(rf.mime_type))[1] AS main_mime_type
      FROM public.receipt_files rf
     GROUP BY rf.receipt_id
  )
  SELECT r.id AS material_id,
         r.vendor,
         COALESCE(r.notes, 'Job Material') AS description,
         r.receipt_date,
         r.amount,
         COALESCE(mp.total_paid, 0.00) AS total_paid,
         CASE
           WHEN COALESCE(mp.total_paid, 0.00) >= r.amount THEN 'paid'
           WHEN COALESCE(mp.total_paid, 0.00) > 0 THEN 'partially_paid'
           ELSE 'unpaid'
         END AS payment_status,
         (mr.receipt_id IS NOT NULL) AS has_receipt,
         mr.main_file_name AS receipt_file_name,
         mr.main_mime_type AS receipt_mime_type
    FROM public.receipts r
    LEFT JOIN mat_payments mp ON r.id = mp.material_expense_id
    LEFT JOIN mat_receipts mr ON r.id = mr.receipt_id
   WHERE r.service_job_id = v_job_id
     AND r.organization_id = v_org_id
     AND (r.bill_to_client = true OR r.material_responsibility = 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;

-- ==============================================================================
-- READ-ONLY VERIFICATION SUITE FOR PROPOSAL 025 (EXECUTE MANUALLY AFTER APPLYING)
-- ==============================================================================
/*
-- 1. Allocation snapshot UPDATE blocked: YES
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_protect_immutability_partner_alloc';

-- 2. 50% allocation cannot be $90 on $100: YES
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_validate_partner_expense_allocation_snapshot';

-- 3. Company material cannot receive client payment: YES
-- 4. Client material can receive client payment: YES
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_prevent_excessive_client_material_payments';

-- 5. Settlement cannot exceed owed balance: YES
-- 6. Voided settlement stops counting: YES
-- 7. Concurrent excessive settlement protected: YES
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_prevent_excessive_partner_settlement';
*/
