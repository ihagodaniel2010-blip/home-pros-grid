-- ==============================================================================
-- PROPOSAL SQL: 025_job_financial_partner_accounting_PROPOSAL.sql
-- PURPOSE: Enterprise Partner Accounting, Historical Allocations, Material Ledger & Hardened Audit Security
-- AUTHORIZATION: PROPOSAL ONLY - DO NOT EXECUTE AUTOMATICALLY
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. UPDATED_AT TRIGGER HELPER FUNCTION
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. OWNERSHIP VALIDATION TRIGGER (FECHAMENTO DE 100.00% POR TIPO DE EMPRESA)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_organization_ownership_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC(5,2);
  v_target_org UUID;
  v_ownership_type TEXT;
BEGIN
  v_target_org := COALESCE(NEW.organization_id, OLD.organization_id);

  -- Obter modo de propriedade configurado em company_settings
  SELECT business_ownership_type INTO v_ownership_type
    FROM public.company_settings
   WHERE organization_id = v_target_org;

  SELECT COALESCE(SUM(ownership_percentage), 0.00)
    INTO v_total
    FROM public.organization_partners
   WHERE organization_id = v_target_org
     AND active = true;

  -- Se for Sociedade (partnership), ativamente exige que a soma dos sócios seja EXATAMENTE 100.00%
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

-- ------------------------------------------------------------------------------
-- 3. EXTEND COMPANY SETTINGS & RECEIPTS WITH COMPOSITE KEYS & LEGACY SAFE NULL
-- ------------------------------------------------------------------------------
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS business_ownership_type TEXT DEFAULT 'single_owner'
    CHECK (business_ownership_type IN ('single_owner', 'partnership'));

-- Garantir chave composta em service_jobs para composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_service_jobs_id_org'
  ) THEN
    ALTER TABLE public.service_jobs ADD CONSTRAINT uq_service_jobs_id_org UNIQUE (id, organization_id);
  END IF;
END $$;

-- Garantir chave composta em receipts para composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_receipts_id_org'
  ) THEN
    ALTER TABLE public.receipts ADD CONSTRAINT uq_receipts_id_org UNIQUE (id, organization_id);
  END IF;
END $$;

-- Receipts legado: material_responsibility inicia NULL (Unclassified) sem forçar 'company'
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS material_responsibility TEXT DEFAULT NULL
    CHECK (material_responsibility IS NULL OR material_responsibility IN ('client', 'company')),
  ADD COLUMN IF NOT EXISTS paid_by_partner_id UUID DEFAULT NULL;

-- Composite FK: (paid_by_partner_id, organization_id) -> organization_partners(id, organization_id)
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
-- 4. HISTORICAL PARTNER EXPENSE ALLOCATIONS (partner_expense_allocations)
-- Preserva snapshot exato do momento em que a despesa foi lançada
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

-- ------------------------------------------------------------------------------
-- 5. EXPENSE REFUNDS / MATERIAL RETURNS & OVER-LIMIT PROTECTION (expense_refunds)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_excessive_expense_refunds ON public.expense_refunds;
CREATE TRIGGER trg_prevent_excessive_expense_refunds
  BEFORE INSERT OR UPDATE ON public.expense_refunds
  FOR EACH ROW EXECUTE FUNCTION public.prevent_excessive_expense_refunds();

-- ------------------------------------------------------------------------------
-- 6. CLIENT MATERIAL PAYMENT LEDGER & OVERPAYMENT PROTECTION (client_material_payments)
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

-- Trigger de Proteção contra Overpayment do Material do Cliente
CREATE OR REPLACE FUNCTION public.prevent_excessive_client_material_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_material_amount NUMERIC(12,2);
  v_total_paid NUMERIC(12,2);
BEGIN
  IF NEW.status = 'received' THEN
    SELECT amount INTO v_material_amount
      FROM public.receipts
     WHERE id = NEW.material_expense_id AND organization_id = NEW.organization_id;

    IF v_material_amount IS NULL THEN
      RAISE EXCEPTION 'Target material expense % not found in organization %.', NEW.material_expense_id, NEW.organization_id;
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
-- 7. PARTNER SETTLEMENTS TABLE & COMPOSITE FK (partner_settlements)
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

-- Composite FK for job when specified
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

-- ------------------------------------------------------------------------------
-- 8. ANULAÇÃO DE HARD DELETE EM TRANSAÇÕES FINANCEIRAS (AUDITABILITY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_financial_hard_deletes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion of financial records (%) is strictly prohibited for compliance & auditing. Mark status as voided instead.', TG_TABLE_NAME;
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
-- 9. ROLE-AWARE RLS POLICIES & CONTROLES DE SEGURANÇA
-- Workers não visualizam balanços de sócios nem participações societárias
-- ------------------------------------------------------------------------------
ALTER TABLE public.organization_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_expense_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_material_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;

-- Helper Function para verificar se usuário possui role financeira autorizada (owner, admin, contractor)
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

-- Policies para organization_partners (Visualização RESTREITA a gestores financeiros)
CREATE POLICY "Partners Financial Select Policy" ON public.organization_partners
  FOR SELECT USING (public.is_org_financial_manager(organization_id));

CREATE POLICY "Partners Financial Admin Write Policy" ON public.organization_partners
  FOR ALL USING (public.is_org_financial_manager(organization_id));

-- Policies para partner_expense_allocations (RESTREITO a gestores financeiros)
CREATE POLICY "Expense Allocations Financial Select Policy" ON public.partner_expense_allocations
  FOR SELECT USING (public.is_org_financial_manager(organization_id));

CREATE POLICY "Expense Allocations Insert Policy" ON public.partner_expense_allocations
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

-- Policies para expense_refunds
CREATE POLICY "Expense Refunds Select Policy" ON public.expense_refunds
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Expense Refunds Write Policy" ON public.expense_refunds
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

CREATE POLICY "Expense Refunds Void Policy" ON public.expense_refunds
  FOR UPDATE USING (
    public.is_org_financial_manager(organization_id)
    AND NEW.status = 'voided'
  );

-- Policies para client_material_payments
CREATE POLICY "Client Material Payments Select Policy" ON public.client_material_payments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Client Material Payments Write Policy" ON public.client_material_payments
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

CREATE POLICY "Client Material Payments Void Policy" ON public.client_material_payments
  FOR UPDATE USING (
    public.is_org_financial_manager(organization_id)
    AND NEW.status = 'voided'
  );

-- Policies para partner_settlements (RESTREITO a gestores financeiros)
CREATE POLICY "Partner Settlements Financial Select Policy" ON public.partner_settlements
  FOR SELECT USING (public.is_org_financial_manager(organization_id));

CREATE POLICY "Partner Settlements Write Policy" ON public.partner_settlements
  FOR INSERT WITH CHECK (public.is_org_financial_manager(organization_id));

CREATE POLICY "Partner Settlements Void Policy" ON public.partner_settlements
  FOR UPDATE USING (
    public.is_org_financial_manager(organization_id)
    AND NEW.status = 'voided'
  );

-- ------------------------------------------------------------------------------
-- 10. HARDENED SECURITY DEFINER RPC FOR CLIENT PUBLIC PORTAL MATERIALS & RECEIPTS
-- Valida public token do job e retorna APENAS materiais do cliente com suporte a recibos seguros
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
  receipt_file_path TEXT,
  receipt_file_name TEXT,
  receipt_mime_type TEXT
) AS $$
DECLARE
  v_job_id UUID;
  v_org_id UUID;
BEGIN
  -- Validar public token contra a tabela de estimates
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
         rf.storage_path AS receipt_file_path,
         rf.file_name AS receipt_file_name,
         rf.mime_type AS receipt_mime_type
    FROM public.receipts r
    LEFT JOIN public.client_material_payments cmp ON r.id = cmp.material_expense_id
    LEFT JOIN public.receipt_files rf ON r.id = rf.receipt_id
   WHERE r.service_job_id = v_job_id
     AND r.organization_id = v_org_id
     AND (r.bill_to_client = true OR r.material_responsibility = 'client')
   GROUP BY r.id, r.vendor, r.notes, r.receipt_date, r.amount, rf.storage_path, rf.file_name, rf.mime_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;

-- ==============================================================================
-- TEST CASES & MATEMÁTICA SOCIETÁRIA (DOCUMENTAÇÃO DAS REGRAS)
-- ==============================================================================
/*
FÓRMULAS DE CONTABILIDADE SOCIETÁRIA:
--------------------------------------------------------------------------------
1. Net Expense = receipts.amount - SUM(expense_refunds.amount WHERE status = 'posted')
2. Partner Obligation (Despesa Pessoal do Sócio Payer):
   - Se o sócio Payer pagou $100 com dinheiro pessoal numa sociedade 50/50:
     Company Expense Liquida = $100
     Payer Partner Advance = $100
     Outro Sócio (Payee) Obligation = $100 * 50% = $50
     Result: Payee deve $50 ao Payer.
3. Se houver Refund de $40:
   - Net Expense = $60
   - Payee Obligation recalculada = $60 * 50% = $30.
   - Result: Payee deve $30 ao Payer.
4. Partner Settlement (Pagamento em Dinheiro REAL entre Sócios):
   - Payee transfere $20 ao Payer -> Saldo restante = Payee deve $10 ao Payer.

TEST CASES VALIDATION SUITE:
--------------------------------------------------------------------------------
CASE A: Legacy receipt -> material_responsibility IS NULL (Unclassified)
CASE B: Receipts com partner de org B em org A -> REJEITADO via FK Composta (paid_by_partner_id, organization_id)
CASE C: Settlements de org A com job de org B -> REJEITADO via FK Composta (service_job_id, organization_id)
CASE D: Client material $500, pagamentos $400 + $100 -> ACEITO
CASE E: Mais $1 de pagamento no material -> REJEITADO pelo trigger prevent_excessive_client_material_payments
CASE F: Material payment voided -> deixa de contar no total pago
CASE G: Expense $100 paid by Hugo 50/50 -> Brother obligation = $50. Refund $40 -> net expense $60 -> Brother obligation = $30
CASE H: Allocation duplicada para o mesmo sócio na mesma despesa -> REJEITADO pela constraint UNIQUE (expense_id, partner_id)
CASE I: Worker tenta ler partner_settlements ou partner_expense_allocations -> REJEITADO pelo RLS Role-Aware
CASE J: Gestor financeiro (owner/admin/contractor) lê -> ACEITO
*/

-- ==============================================================================
-- READ-ONLY VERIFICATION SUITE FOR PROPOSAL 025 (EXECUTE MANUALLY AFTER APPLYING)
-- ==============================================================================
/*
-- 1. Verificar colunas e FKs compostas novas
SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('receipts', 'company_settings', 'organization_partners', 'partner_expense_allocations', 'expense_refunds', 'client_material_payments', 'partner_settlements')
 ORDER BY table_name, ordinal_position;

-- 2. Verificar FKs compostas e constraints de unicidade
SELECT conname, contype, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE connamespace = 'public'::regnamespace
   AND conname IN ('fk_receipts_partner_org', 'fk_settlement_job_org', 'uq_expense_partner', 'uq_partner_org_id');

-- 3. Verificar triggers e funções SECURITY DEFINER
SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
 WHERE n.nspname = 'public'
   AND p.proname IN ('validate_organization_ownership_total', 'prevent_excessive_expense_refunds', 'prevent_excessive_client_material_payments', 'prevent_financial_hard_deletes', 'is_org_financial_manager', 'get_client_job_materials');

-- 4. Verificar RLS Policies
SELECT tablename, policyname, roles, cmd, qual
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('organization_partners', 'partner_expense_allocations', 'expense_refunds', 'client_material_payments', 'partner_settlements');
*/
