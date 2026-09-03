-- Migration 021: Auditable Sandbox Test Credit Reversal
-- Target Project: Carpentry (ozhjvprhhsdglxokfwze / https://ozhjvprhhsdglxokfwze.supabase.co)
-- Status: PROPOSAL ONLY (DO NOT APPLY WITHOUT EXPLICIT USER AUTHORIZATION)

SET search_path = public;

DO $$
DECLARE
    v_test_entry RECORD;
    v_reversal_count INT := 0;
    v_new_ledger_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Find latest Stripe sandbox test credit entry
    SELECT id, organization_id, amount, reference_id
    INTO v_test_entry
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND amount = 50.00
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_test_entry.id IS NULL THEN
        RAISE EXCEPTION 'ABORTED: No Stripe sandbox test credit entry ($50.00) found in ledger.';
    END IF;

    -- 2. Check if reversal has already been executed for this reference_id
    SELECT COUNT(*) INTO v_reversal_count
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_sandbox_cleanup'
      AND reference_id = v_test_entry.reference_id;

    IF v_reversal_count > 0 THEN
        RAISE EXCEPTION 'ABORTED: Sandbox test credit for session % has already been reversed.', v_test_entry.reference_id;
    END IF;

    -- 3. Insert auditable adjustment entry (-50.00)
    INSERT INTO public.organization_credit_ledger (
        organization_id,
        amount,
        transaction_type,
        reference_type,
        reference_id,
        description
    ) VALUES (
        v_test_entry.organization_id,
        -50.00,
        'adjustment',
        'stripe_sandbox_cleanup',
        v_test_entry.reference_id,
        'Reverse Stripe sandbox test credit from Fase 9.3.2'
    )
    RETURNING id INTO v_new_ledger_id;

    -- 4. Calculate updated balance
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM public.organization_credit_ledger
    WHERE organization_id = v_test_entry.organization_id;

    RAISE NOTICE 'Auditable Reversal Recorded Successfully. Ledger ID: %, New Balance: $%', v_new_ledger_id, v_new_balance;
END;
$$;
