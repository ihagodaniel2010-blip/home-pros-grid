-- Pre-Check 021 Complementar: Full Untruncated Session ID Inspection
-- Target Project: Carpentry (ozhjvprhhsdglxokfwze / https://ozhjvprhhsdglxokfwze.supabase.co)
-- Status: MANUAL SELECT QUERY ONLY (DO NOT APPLY MIGRATION 021 YET)

SET search_path = public;

-- 1. Inspect original Stripe sandbox test credit entry with full reference_id
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
  AND transaction_type = 'credit_added'
  AND description ILIKE '%Stripe Online Top-Up%'
ORDER BY created_at DESC;

-- 2. Check for existing reversal using stripe_sandbox_cleanup
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
