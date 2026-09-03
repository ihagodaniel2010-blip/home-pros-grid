-- Pre-Check Script for Auditable Sandbox Credit Reversal (Migration 021)
-- Target Project: Carpentry (ozhjvprhhsdglxokfwze / https://ozhjvprhhsdglxokfwze.supabase.co)
-- Status: PRE-CHECK ONLY (RUN MANUALLY IN SUPABASE SQL EDITOR BEFORE APPLYING MIGRATION 021)

SET search_path = public;

-- 1. Inspect original Stripe sandbox test credit entry
SELECT 
    id AS test_credit_id,
    organization_id,
    amount,
    transaction_type,
    reference_type,
    reference_id,
    description,
    created_at
FROM public.organization_credit_ledger
WHERE reference_type = 'stripe_checkout_session'
  AND amount = 50.00
ORDER BY created_at DESC;

-- 2. Check if a reversal/cleanup entry already exists
SELECT 
    id AS existing_reversal_id,
    organization_id,
    amount,
    transaction_type,
    reference_type,
    reference_id,
    description,
    created_at
FROM public.organization_credit_ledger
WHERE reference_type = 'stripe_sandbox_cleanup';

-- 3. Check current total balance vs expected balance after -50.00 adjustment
SELECT 
    COALESCE(SUM(amount), 0) AS current_balance,
    COALESCE(SUM(amount), 0) - 50.00 AS expected_balance_after_reversal
FROM public.organization_credit_ledger;
