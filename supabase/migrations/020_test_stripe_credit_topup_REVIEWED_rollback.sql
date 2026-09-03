-- Rollback Test 020 REVIEWED: Test Idempotency and Transaction Safety
-- Status: TEST SCRIPT ONLY (RUNS INSIDE TRANSACTION AND ROLLS BACK 100%)

BEGIN;

-- 1. Create temporary index & test function
SET search_path = public;

CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_reference_id 
ON public.organization_credit_ledger (reference_id) 
WHERE reference_id IS NOT NULL;

-- 2. Test Execution inside transaction
DO $$
DECLARE
    v_test_org_id UUID := '00000000-0000-0000-0000-000000000001';
    v_session_id TEXT := 'cs_test_simulated_session_999';
    v_res1 JSONB;
    v_res2 JSONB;
    v_count INT;
BEGIN
    -- First recording call
    v_res1 := public.record_stripe_credit_topup(v_test_org_id, 100.00, v_session_id, 'credit_100');
    ASSERT (v_res1->>'success')::boolean = true, 'First recording failed';
    ASSERT (v_res1->>'duplicate')::boolean = false, 'First recording incorrectly flagged as duplicate';

    -- Second recording call (Duplicate test)
    v_res2 := public.record_stripe_credit_topup(v_test_org_id, 100.00, v_session_id, 'credit_100');
    ASSERT (v_res2->>'success')::boolean = true, 'Second recording failed';
    ASSERT (v_res2->>'duplicate')::boolean = true, 'Second recording failed idempotency check';

    -- Verify ledger count
    SELECT COUNT(*) INTO v_count
    FROM public.organization_credit_ledger
    WHERE reference_id = v_session_id;

    ASSERT v_count = 1, 'Expected exactly 1 ledger record for session ID';

    RAISE NOTICE 'Rollback Test 020 Passed: Idempotency verified successfully.';
END;
$$;

-- 3. Always ROLLBACK to keep database completely untouched
ROLLBACK;
