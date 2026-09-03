-- Rollback Test 020 FINAL REVIEW: Fully Self-Contained Test Suite for Function & Idempotency
-- Status: TEST SCRIPT ONLY (RUNS INSIDE TRANSACTION AND ROLLS BACK 100% CLEANLY)

BEGIN;

SET search_path = public;

-- 1. Create temporary test index inside transaction
CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_ref_type_id 
ON public.organization_credit_ledger (reference_type, reference_id) 
WHERE reference_id IS NOT NULL;

-- 2. Create/Recreate function inside transaction before testing
CREATE OR REPLACE FUNCTION public.record_stripe_credit_topup(
    p_organization_id UUID,
    p_amount NUMERIC,
    p_stripe_session_id TEXT,
    p_package_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_new_ledger_id UUID;
    v_new_balance NUMERIC;
    v_org_exists BOOLEAN;
BEGIN
    IF p_organization_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'organization_id is required.');
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) INTO v_org_exists;
    IF NOT v_org_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Organization does not exist in system.');
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'amount must be greater than zero.');
    END IF;

    IF p_stripe_session_id IS NULL OR TRIM(p_stripe_session_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'stripe_session_id is required.');
    END IF;

    SELECT id INTO v_existing_id
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND reference_id = TRIM(p_stripe_session_id)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'message', 'Stripe checkout session has already been credited.',
            'ledger_id', v_existing_id
        );
    END IF;

    INSERT INTO public.organization_credit_ledger (
        organization_id,
        amount,
        transaction_type,
        reference_type,
        reference_id,
        description
    ) VALUES (
        p_organization_id,
        p_amount,
        'credit_added',
        'stripe_checkout_session',
        TRIM(p_stripe_session_id),
        COALESCE('Stripe Online Top-Up (' || p_package_id || ')', 'Stripe Online Credit Deposit')
    )
    RETURNING id INTO v_new_ledger_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM public.organization_credit_ledger
    WHERE organization_id = p_organization_id;

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'ledger_id', v_new_ledger_id,
        'new_balance', v_new_balance,
        'message', 'Credit top-up recorded successfully.'
    );
END;
$$;

-- 3. Execute Test Suite
DO $$
DECLARE
    v_test_org_id UUID := '11111111-1111-1111-1111-111111111111';
    v_invalid_org_id UUID := '99999999-9999-9999-9999-999999999999';
    v_session_id TEXT := 'cs_test_final_review_session_100';
    v_res1 JSONB;
    v_res2 JSONB;
    v_res_invalid_amt JSONB;
    v_res_empty_session JSONB;
    v_res_invalid_org JSONB;
    v_count INT;
BEGIN
    -- Setup temporary test organization in transaction
    INSERT INTO public.organizations (id, name, slug)
    VALUES (v_test_org_id, 'Test Org QA', 'test-org-qa')
    ON CONFLICT (id) DO NOTHING;

    -- Test 1: First valid top-up recording
    v_res1 := public.record_stripe_credit_topup(v_test_org_id, 100.00, v_session_id, 'credit_100');
    ASSERT (v_res1->>'success')::boolean = true, 'Test 1 Failed: First recording did not succeed.';
    ASSERT (v_res1->>'duplicate')::boolean = false, 'Test 1 Failed: First recording marked as duplicate.';

    -- Test 2: Second duplicate recording with same session ID
    v_res2 := public.record_stripe_credit_topup(v_test_org_id, 100.00, v_session_id, 'credit_100');
    ASSERT (v_res2->>'success')::boolean = true, 'Test 2 Failed: Second recording failed.';
    ASSERT (v_res2->>'duplicate')::boolean = true, 'Test 2 Failed: Second recording failed idempotency check.';

    -- Verify ledger entry count is exactly 1
    SELECT COUNT(*) INTO v_count
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND reference_id = v_session_id;

    ASSERT v_count = 1, 'Test 2 Failed: Expected exactly 1 ledger record for session ID.';

    -- Test 3: Invalid negative amount validation
    v_res_invalid_amt := public.record_stripe_credit_topup(v_test_org_id, -50.00, 'cs_test_neg', 'credit_50');
    ASSERT (v_res_invalid_amt->>'success')::boolean = false, 'Test 3 Failed: Invalid negative amount was accepted.';

    -- Test 4: Empty stripe_session_id validation
    v_res_empty_session := public.record_stripe_credit_topup(v_test_org_id, 50.00, '', 'credit_50');
    ASSERT (v_res_empty_session->>'success')::boolean = false, 'Test 4 Failed: Empty session ID was accepted.';

    -- Test 5: Non-existent organization validation
    v_res_invalid_org := public.record_stripe_credit_topup(v_invalid_org_id, 50.00, 'cs_test_invalid_org', 'credit_50');
    ASSERT (v_res_invalid_org->>'success')::boolean = false, 'Test 5 Failed: Non-existent organization was accepted.';

    RAISE NOTICE 'Rollback Test 020 FINAL REVIEW Passed: All 5 validation and idempotency tests succeeded.';
END;
$$;

-- 4. Always ROLLBACK so no changes persist in the database
ROLLBACK;
