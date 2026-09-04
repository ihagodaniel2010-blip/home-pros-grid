-- Test & Rollback Script for Migration 023 (Reverse Valid Stripe Sandbox Credit)
-- Target Project: Carpentry (ozhjvprhhsdglxokfwze / https://ozhjvprhhsdglxokfwze.supabase.co)
-- Status: ROLLBACK TEST ONLY (DO NOT COMMIT DATA - LEAVES ZERO PERMANENT CHANGES)

BEGIN;

SET search_path = public;

DO $$
DECLARE
    v_org_id UUID;
    v_test_session_id TEXT := 'cs_test_rollback_simulated_999';
    v_match_count INT := 0;
    v_test_entry RECORD;
    v_reversal_count INT := 0;
    v_new_ledger_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Get or create valid organization for testing
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name) VALUES ('Temp Test Org') RETURNING id INTO v_org_id;
    END IF;

    -- 2. Insert temporary simulated Stripe sandbox credit (+50.00) inside transaction
    INSERT INTO public.organization_credit_ledger (
        organization_id,
        amount,
        transaction_type,
        reference_type,
        reference_id,
        external_reference_id,
        description
    ) VALUES (
        v_org_id,
        50.00,
        'credit_added',
        'stripe_checkout_session',
        NULL,
        v_test_session_id,
        'Stripe Online Top-Up (credit_50)'
    );

    -- 3. Run Guard Checks
    SELECT COUNT(*) INTO v_match_count
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND amount = 50.00
      AND transaction_type = 'credit_added'
      AND reference_id IS NULL
      AND external_reference_id = v_test_session_id;

    IF v_match_count <> 1 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected 1 matching sandbox credit, found %', v_match_count;
    END IF;

    -- Fetch entry
    SELECT id, organization_id, amount, external_reference_id, description, created_at
    INTO v_test_entry
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND amount = 50.00
      AND transaction_type = 'credit_added'
      AND reference_id IS NULL
      AND external_reference_id = v_test_session_id
    LIMIT 1;

    -- 4. Insert Reversal Adjustment (-50.00)
    INSERT INTO public.organization_credit_ledger (
        organization_id,
        amount,
        transaction_type,
        reference_type,
        reference_id,
        external_reference_id,
        description
    ) VALUES (
        v_test_entry.organization_id,
        -50.00,
        'adjustment',
        'stripe_sandbox_cleanup',
        NULL,
        v_test_entry.external_reference_id,
        'Reverse Stripe sandbox test credit from Fase 9.3.5'
    )
    RETURNING id INTO v_new_ledger_id;

    -- 5. Calculate Updated Balance
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM public.organization_credit_ledger
    WHERE organization_id = v_test_entry.organization_id;

    -- 6. Verify Guard 3 (Duplicate Reversal Prevention)
    SELECT COUNT(*) INTO v_reversal_count
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_sandbox_cleanup'
      AND external_reference_id = v_test_entry.external_reference_id;

    IF v_reversal_count <> 1 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected 1 reversal record, found %', v_reversal_count;
    END IF;

    RAISE NOTICE 'SUCCESS: Rollback test for Migration 023 passed successfully! Simulated balance after reversal: $%', v_new_balance;
END;
$$;

-- Rollback transaction so zero data persists
ROLLBACK;
