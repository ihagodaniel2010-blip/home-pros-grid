-- ==============================================================================
-- ROLLBACK SQL: 025_job_financial_partner_accounting_ROLLBACK_TEST.sql
-- PURPOSE: Rollback 025 migration additions safely in reverse dependency order
-- AUTHORIZATION: ROLLBACK TEST ONLY - DO NOT EXECUTE AUTOMATICALLY
-- ==============================================================================

BEGIN;

-- 1. Drop Security Definer RPCs
DROP FUNCTION IF EXISTS public.get_client_job_materials(TEXT);
DROP FUNCTION IF EXISTS public.is_org_financial_manager(UUID);

-- 2. Drop Audit & Constraint Triggers
DROP TRIGGER IF EXISTS trg_no_delete_partner_settlements ON public.partner_settlements;
DROP TRIGGER IF EXISTS trg_no_delete_client_mat_pay ON public.client_material_payments;
DROP TRIGGER IF EXISTS trg_no_delete_expense_refunds ON public.expense_refunds;
DROP TRIGGER IF EXISTS trg_no_delete_expense_alloc ON public.partner_expense_allocations;
DROP TRIGGER IF EXISTS trg_prevent_excessive_expense_refunds ON public.expense_refunds;
DROP TRIGGER IF EXISTS trg_validate_organization_ownership ON public.organization_partners;

DROP FUNCTION IF EXISTS public.prevent_financial_hard_deletes();
DROP FUNCTION IF EXISTS public.prevent_excessive_expense_refunds();
DROP FUNCTION IF EXISTS public.validate_organization_ownership_total();

-- 3. Drop Tables in Reverse Dependency Order
DROP TABLE IF EXISTS public.partner_settlements RESTRICT;
DROP TABLE IF EXISTS public.client_material_payments RESTRICT;
DROP TABLE IF EXISTS public.expense_refunds RESTRICT;
DROP TABLE IF EXISTS public.partner_expense_allocations RESTRICT;
DROP TABLE IF EXISTS public.organization_partners RESTRICT;

-- 4. Revert Column Additions on Receipts and Company Settings
ALTER TABLE public.receipts
  DROP COLUMN IF EXISTS paid_by_partner_id,
  DROP COLUMN IF EXISTS material_responsibility;

ALTER TABLE public.company_settings
  DROP COLUMN IF EXISTS business_ownership_type;

COMMIT;
