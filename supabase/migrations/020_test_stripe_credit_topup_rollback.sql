-- Migration Rollback Proposal 020: Revert Stripe Credit Top-Up Function & Index
-- Status: PROPOSAL ONLY (DO NOT APPLY AUTOMATICALLY)

DROP FUNCTION IF EXISTS public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT);
DROP INDEX IF EXISTS public.idx_organization_credit_ledger_reference_id;
