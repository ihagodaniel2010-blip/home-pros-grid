-- ==============================================================================
-- PROPOSAL SQL: 025_job_financial_partner_accounting_PROPOSAL.sql
-- PURPOSE: Complete Partner Accounting, Company Ownership Structure, Material Financial Classification & Expense Refunds
-- AUTHORIZATION: PROPOSAL ONLY - DO NOT EXECUTE AUTOMATICALLY
-- ==============================================================================

-- 1. Extend Company Settings with Ownership Structure & Partners
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS business_ownership_type TEXT DEFAULT 'single_owner',
  ADD COLUMN IF NOT EXISTS partners JSONB DEFAULT '[]'::jsonb;

-- 2. Extend Receipts / Expenses for Material Financial Classification
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS material_responsibility TEXT DEFAULT 'company', -- 'client' or 'company'
  ADD COLUMN IF NOT EXISTS material_payment_status TEXT DEFAULT 'unpaid',  -- 'unpaid', 'paid', 'partially_paid'
  ADD COLUMN IF NOT EXISTS material_paid_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_by_partner_id TEXT DEFAULT NULL;

-- 3. Create Expense Refunds / Material Returns Table
CREATE TABLE IF NOT EXISTS public.expense_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  service_job_id UUID REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  receipt_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for expense_refunds
ALTER TABLE public.expense_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage expense refunds for their org" ON public.expense_refunds
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

-- 4. Create Partner Settlements Table
CREATE TABLE IF NOT EXISTS public.partner_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  service_job_id UUID REFERENCES public.service_jobs(id) ON DELETE SET NULL,
  payer_partner_id TEXT NOT NULL,
  payee_partner_id TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for partner_settlements
ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage partner settlements for their org" ON public.partner_settlements
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_expense_refunds_job ON public.expense_refunds(service_job_id);
CREATE INDEX IF NOT EXISTS idx_expense_refunds_expense ON public.expense_refunds(expense_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlements_job ON public.partner_settlements(service_job_id);
CREATE INDEX IF NOT EXISTS idx_receipts_responsibility ON public.receipts(material_responsibility);
