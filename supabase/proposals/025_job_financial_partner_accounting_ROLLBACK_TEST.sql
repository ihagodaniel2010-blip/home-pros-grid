-- ==============================================================================
-- ROLLBACK SQL: 025_job_financial_partner_accounting_ROLLBACK_TEST.sql
-- PURPOSE: Rollback 025 migration additions safely in reverse dependency order
-- AUTHORIZATION: ROLLBACK TEST ONLY - DO NOT EXECUTE AUTOMATICALLY
-- ==============================================================================

BEGIN;

-- 1. Drop Security Definer RPCs & Helper Functions
DROP FUNCTION IF EXISTS public.get_client_job_materials(TEXT);
DROP FUNCTION IF EXISTS public.is_org_financial_manager(UUID);

-- 2. Drop Audit, Immutability, Overpayment & Constraint Triggers
DROP TRIGGER IF EXISTS trg_no_delete_partner_settlements ON public.partner_settlements;
DROP TRIGGER IF EXISTS trg_no_delete_client_mat_pay ON public.client_material_payments;
DROP TRIGGER IF EXISTS trg_no_delete_expense_refunds ON public.expense_refunds;
DROP TRIGGER IF EXISTS trg_no_delete_expense_alloc ON public.partner_expense_allocations;

DROP TRIGGER IF EXISTS trg_prevent_excessive_partner_settlement ON public.partner_settlements;
DROP TRIGGER IF EXISTS trg_protect_immutability_partner_settlements ON public.partner_settlements;
DROP TRIGGER IF EXISTS trg_protect_immutability_client_mat_pay ON public.client_material_payments;
DROP TRIGGER IF EXISTS trg_protect_immutability_expense_refunds ON public.expense_refunds;
DROP TRIGGER IF EXISTS trg_protect_immutability_partner_alloc ON public.partner_expense_allocations;

DROP TRIGGER IF EXISTS trg_prevent_excessive_client_material_payments ON public.client_material_payments;
DROP TRIGGER IF EXISTS trg_prevent_excessive_expense_refunds ON public.expense_refunds;

DROP TRIGGER IF EXISTS trg_validate_partner_expense_allocation_snapshot ON public.partner_expense_allocations;
DROP TRIGGER IF EXISTS trg_validate_company_ownership_mode ON public.company_settings;
DROP TRIGGER IF EXISTS trg_validate_organization_ownership ON public.organization_partners;

DROP TRIGGER IF EXISTS trg_set_updated_at_partner_settlements ON public.partner_settlements;
DROP TRIGGER IF EXISTS trg_set_updated_at_client_mat_pay ON public.client_material_payments;
DROP TRIGGER IF EXISTS trg_set_updated_at_expense_refunds ON public.expense_refunds;
DROP TRIGGER IF EXISTS trg_set_updated_at_partner_alloc ON public.partner_expense_allocations;
DROP TRIGGER IF EXISTS trg_set_updated_at_org_partners ON public.organization_partners;

-- 3. Drop Trigger Functions Created by 025
DROP FUNCTION IF EXISTS public.prevent_financial_hard_deletes();
DROP FUNCTION IF EXISTS public.protect_partner_settlements_immutability_and_void();
DROP FUNCTION IF EXISTS public.protect_client_material_payments_immutability_and_void();
DROP FUNCTION IF EXISTS public.protect_expense_refunds_immutability_and_void();
DROP FUNCTION IF EXISTS public.protect_partner_expense_allocation_immutability();
DROP FUNCTION IF EXISTS public.prevent_excessive_partner_settlements();
DROP FUNCTION IF EXISTS public.prevent_excessive_client_material_payments();
DROP FUNCTION IF EXISTS public.prevent_excessive_expense_refunds();
DROP FUNCTION IF EXISTS public.validate_partner_expense_allocation_snapshot();
DROP FUNCTION IF EXISTS public.validate_company_ownership_mode();
DROP FUNCTION IF EXISTS public.validate_organization_ownership_total();
DROP FUNCTION IF EXISTS public.set_financial_updated_at();

-- 4. Drop Tables Created by 025 in Reverse Dependency Order
DROP TABLE IF EXISTS public.partner_settlements RESTRICT;
DROP TABLE IF EXISTS public.client_material_payments RESTRICT;
DROP TABLE IF EXISTS public.expense_refunds RESTRICT;
DROP TABLE IF EXISTS public.partner_expense_allocations RESTRICT;
DROP TABLE IF EXISTS public.organization_partners RESTRICT;

-- 5. Revert Column Additions and Foreign Key Constraints Added by 025
ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS fk_receipts_partner_org,
  DROP COLUMN IF EXISTS paid_by_partner_id,
  DROP COLUMN IF EXISTS material_responsibility;

ALTER TABLE public.company_settings
  DROP COLUMN IF EXISTS business_ownership_type;

COMMIT;
