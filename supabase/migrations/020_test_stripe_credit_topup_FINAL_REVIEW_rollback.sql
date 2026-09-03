-- Rollback Test 020 FINAL REVIEW: Fully Self-Contained Test Suite for Function & Idempotency
-- Status: TEST SCRIPT ONLY (RUNS INSIDE TRANSACTION AND ROLLS BACK 100% CLEANLY)

BEGIN;

SET search_path = public;

-- 0a. Create temporary organizations table inside transaction if missing
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    is_platform_owner BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 0b. Create temporary organization_credit_ledger table inside transaction if missing
CREATE TABLE IF NOT EXISTS public.organization_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_added', 'lead_debit', 'adjustment', 'refund_manual')),
    reference_type TEXT,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Create temporary test index inside transaction
CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_ref_type_id 
ON public.organization_credit_ledger (reference_type, reference_id) 
WHERE reference_id IS NOT NULL;

-- 2. Create function inside transaction BEFORE testing (100% IDENTICAL TO OFFICIAL 020 MIGRATION)
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
    -- Validation 1: Check required organization_id
    IF p_organization_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'organization_id is required.');
    END IF;

    -- Validation 2: Verify organization exists in organizations table
    SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) INTO v_org_exists;
    IF NOT v_org_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Organization does not exist in system.');
    END IF;

    -- Validation 3: Verify amount is strictly positive
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'amount must be greater than zero.');
    END IF;

    -- Validation 4: Verify stripe_session_id is non-empty
    IF p_stripe_session_id IS NULL OR TRIM(p_stripe_session_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'stripe_session_id is required.');
    END IF;

    -- Idempotency Check: Verify if session ID has already been credited using reference_type + reference_id
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

    -- Insert new credit transaction using 'credit_added' for CHECK constraint compatibility
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

    -- Calculate updated organization balance
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

-- Lock permissions inside transaction
REVOKE EXECUTE ON FUNCTION public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT) TO service_role;

-- 3. Execute Complete Test Suite
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
    v_res_null_org JSONB;
    v_count INT;
BEGIN
    -- Setup temporary test organization in transaction
    INSERT INTO public.organizations (id, name, slug)
    VALUES (v_test_org_id, 'Test Org QA', 'test-org-qa-final')
    ON CONFLICT (id) DO NOTHING;

    -- Test 1: First valid top-up recording
    v_res1 := public.record_stripe_credit_topup(v_test_org_id, 100.00, v_session_id, 'credit_100');
    ASSERT (v_res1->>'success')::boolean = true, 'Test 1 Failed: First recording did not succeed.';
    ASSERT (v_res1->>'duplicate')::boolean = false, 'Test 1 Failed: First recording marked as duplicate.';

    -- Test 2: Second duplicate recording with same session ID
    v_res2 := public.record_stripe_credit_topup(v_test_org_id, 100.00, v_session_id, 'credit_100');
    ASSERT (v_res2->>'success')::boolean = true, 'Test 2 Failed: Second recording failed.';
    ASSERT (v_res2->>'duplicate')::boolean = true, 'Test 2 Failed: Second recording failed idempotency check.';

    -- Test 3: Verify ledger entry count is exactly 1
    SELECT COUNT(*) INTO v_count
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND reference_id = v_session_id;

    ASSERT v_count = 1, 'Test 3 Failed: Expected exactly 1 ledger record for session ID.';

    -- Test 4: Invalid negative amount validation
    v_res_invalid_amt := public.record_stripe_credit_topup(v_test_org_id, -50.00, 'cs_test_neg', 'credit_50');
    ASSERT (v_res_invalid_amt->>'success')::boolean = false, 'Test 4 Failed: Invalid negative amount was accepted.';

    -- Test 5: Empty stripe_session_id validation
    v_res_empty_session := public.record_stripe_credit_topup(v_test_org_id, 50.00, '', 'credit_50');
    ASSERT (v_res_empty_session->>'success')::boolean = false, 'Test 5 Failed: Empty session ID was accepted.';

    -- Test 6: Non-existent organization_id validation
    v_res_invalid_org := public.record_stripe_credit_topup(v_invalid_org_id, 50.00, 'cs_test_invalid_org', 'credit_50');
    ASSERT (v_res_invalid_org->>'success')::boolean = false, 'Test 6 Failed: Non-existent organization was accepted.';

    -- Test 7: NULL organization_id validation
    v_res_null_org := public.record_stripe_credit_topup(NULL, 50.00, 'cs_test_null_org', 'credit_50');
    ASSERT (v_res_null_org->>'success')::boolean = false, 'Test 7 Failed: NULL organization was accepted.';

    RAISE NOTICE 'Rollback Test 020 FINAL REVIEW Passed: All 7 validation and idempotency tests succeeded.';
END;
$$;

-- 4. Always ROLLBACK so no changes persist in the database
ROLLBACK;
