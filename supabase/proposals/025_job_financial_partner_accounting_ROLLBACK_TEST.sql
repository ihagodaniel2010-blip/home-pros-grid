-- ==============================================================================
-- ROLLBACK SQL: 025_job_financial_partner_accounting_ROLLBACK_TEST.sql
-- PURPOSE: Rollback 025 migration additions safely
-- AUTHORIZATION: ROLLBACK TEST ONLY - DO NOT EXECUTE AUTOMATICALLY
-- ==============================================================================

DROP TABLE IF EXISTS public.partner_settlements CASCADE;
DROP TABLE IF EXISTS public.expense_refunds CASCADE;

ALTER TABLE public.receipts
  DROP COLUMN IF EXISTS material_responsibility,
  DROP COLUMN IF EXISTS material_payment_status,
  DROP COLUMN IF EXISTS material_paid_amount,
  DROP COLUMN IF EXISTS paid_by_partner_id;

ALTER TABLE public.company_settings
  DROP COLUMN IF EXISTS business_ownership_type,
  DROP COLUMN IF EXISTS partners;
