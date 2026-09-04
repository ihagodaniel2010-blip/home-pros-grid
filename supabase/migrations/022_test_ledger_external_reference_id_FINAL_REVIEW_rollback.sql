-- Test & Rollback Script for Migration 022 FINAL REVIEW (CHECK Constraint Fix, External Ref & Stripe RPC)
-- Target Project: Carpentry (ozhjvprhhsdglxokfwze / https://ozhjvprhhsdglxokfwze.supabase.co)
-- Status: ROLLBACK TEST ONLY (DO NOT COMMIT DATA - LEAVES ZERO PERMANENT CHANGES)

BEGIN;

SET search_path = public;

-- 1. Apply Schema Changes in Transaction Scope
ALTER TABLE public.organization_credit_ledger 
ADD COLUMN IF NOT EXISTS external_reference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_external_ref 
ON public.organization_credit_ledger (reference_type, external_reference_id) 
WHERE external_reference_id IS NOT NULL;

-- Safely update CHECK constraint for reference_type inside transaction
ALTER TABLE public.organization_credit_ledger 
DROP CONSTRAINT IF EXISTS organization_credit_ledger_reference_type_check;

ALTER TABLE public.organization_credit_ledger 
ADD CONSTRAINT organization_credit_ledger_reference_type_check 
CHECK (reference_type IN ('lead_distribution', 'admin_adjustment', 'refund', 'stripe_checkout_session', 'stripe_sandbox_cleanup'));

-- Recreate RPC inside transaction
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
      AND external_reference_id = TRIM(p_stripe_session_id)
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
        external_reference_id,
        description
    ) VALUES (
        p_organization_id,
        p_amount,
        'credit_added',
        'stripe_checkout_session',
        NULL,
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

-- 2. Execute Test Suite Block
DO $$
DECLARE
    v_org_id UUID;
    v_res JSONB;
    v_res_dup JSONB;
    v_res_invalid_amount JSONB;
    v_res_empty_session JSONB;
    v_res_invalid_org JSONB;
    v_ledger_rec RECORD;
    v_count INT;
BEGIN
    -- Step A: Get or create valid organization for testing
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name) VALUES ('Temp Test Org') RETURNING id INTO v_org_id;
    END IF;

    -- Step B: First Top-Up Attempt with simulated session ID
    v_res := public.record_stripe_credit_topup(
        v_org_id,
        50.00,
        'cs_test_simulated_123',
        'credit_50'
    );

    IF (v_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Initial RPC call failed: %', v_res->>'message';
    END IF;

    IF (v_res->>'duplicate')::boolean IS TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Initial RPC call marked as duplicate unexpectedly.';
    END IF;

    -- Step C: Inspect Ledger Record created
    SELECT * INTO v_ledger_rec 
    FROM public.organization_credit_ledger 
    WHERE id = (v_res->>'ledger_id')::uuid;

    IF v_ledger_rec.reference_type <> 'stripe_checkout_session' THEN
        RAISE EXCEPTION 'TEST FAILED: reference_type mismatch. Expected stripe_checkout_session, got %', v_ledger_rec.reference_type;
    END IF;

    IF v_ledger_rec.external_reference_id <> 'cs_test_simulated_123' THEN
        RAISE EXCEPTION 'TEST FAILED: external_reference_id mismatch. Expected cs_test_simulated_123, got %', v_ledger_rec.external_reference_id;
    END IF;

    IF v_ledger_rec.reference_id IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAILED: reference_id should be NULL for Stripe external session.';
    END IF;

    -- Step D: Idempotency Duplicate Attempt
    v_res_dup := public.record_stripe_credit_topup(
        v_org_id,
        50.00,
        'cs_test_simulated_123',
        'credit_50'
    );

    IF (v_res_dup->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Duplicate RPC call returned failure: %', v_res_dup->>'message';
    END IF;

    IF (v_res_dup->>'duplicate')::boolean IS TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Duplicate RPC call was not detected as duplicate!';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.organization_credit_ledger
    WHERE external_reference_id = 'cs_test_simulated_123';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected exactly 1 ledger record for session, found %', v_count;
    END IF;

    -- Step E: Edge Case Validation Tests
    -- Negative Amount Test
    v_res_invalid_amount := public.record_stripe_credit_topup(v_org_id, -50.00, 'cs_test_invalid_amount');
    IF (v_res_invalid_amount->>'success')::boolean IS TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Negative amount was incorrectly accepted.';
    END IF;

    -- Empty Session ID Test
    v_res_empty_session := public.record_stripe_credit_topup(v_org_id, 50.00, '   ');
    IF (v_res_empty_session->>'success')::boolean IS TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Empty stripe_session_id was incorrectly accepted.';
    END IF;

    -- Invalid Org ID Test
    v_res_invalid_org := public.record_stripe_credit_topup('00000000-0000-0000-0000-000000000000'::uuid, 50.00, 'cs_test_invalid_org');
    IF (v_res_invalid_org->>'success')::boolean IS TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Non-existent org ID was incorrectly accepted.';
    END IF;

    RAISE NOTICE 'SUCCESS: All Migration 022 FINAL REVIEW Rollback Test assertions passed successfully!';
END;
$$;

-- Always rollback transaction so zero data persists
ROLLBACK;
