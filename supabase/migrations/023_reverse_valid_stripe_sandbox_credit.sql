-- Migration 023: Auditable Sandbox Test Credit Reversal (CANCELED / OBSOLETE)
-- Target Project: Carpentry (ozhjvprhhsdglxokfwze / https://ozhjvprhhsdglxokfwze.supabase.co)
-- Status: CANCELED / OBSOLETE - DO NOT EXECUTE
-- Reason: Pre-check confirmed 0 Stripe test credits in ledger. No reversal is needed or permitted.

SET search_path = public;

DO $$
DECLARE
    v_match_count INT := 0;
    v_test_entry RECORD;
    v_reversal_count INT := 0;
    v_new_ledger_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Check matching count for original Stripe sandbox test credit from Fase 9.3.5
    SELECT COUNT(*) INTO v_match_count
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND amount = 50.00
      AND transaction_type = 'credit_added'
      AND reference_id IS NULL
      AND external_reference_id LIKE 'cs_test_%'
      AND description ILIKE '%Stripe Online Top-Up (credit_50)%';

    -- Guard 1: Abort if 0 matching sandbox credit entries found
    IF v_match_count = 0 THEN
        RAISE EXCEPTION 'ABORTADO: Nenhum credito sandbox de $50.00 com os criterios estritos foi encontrado no ledger.';
    END IF;

    -- Guard 2: Abort if more than 1 matching sandbox credit entry found
    IF v_match_count > 1 THEN
        RAISE EXCEPTION 'ABORTADO: Encontrados % creditos de teste no ledger. Reversao automatica exige exatamente 1 registro.', v_match_count;
    END IF;

    -- 2. Fetch the exact single matching test credit entry
    SELECT id, organization_id, amount, external_reference_id, description, created_at
    INTO v_test_entry
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_checkout_session'
      AND amount = 50.00
      AND transaction_type = 'credit_added'
      AND reference_id IS NULL
      AND external_reference_id LIKE 'cs_test_%'
      AND description ILIKE '%Stripe Online Top-Up (credit_50)%'
    LIMIT 1;

    -- Guard 3: Abort if reversal entry already exists for this exact external_reference_id
    SELECT COUNT(*) INTO v_reversal_count
    FROM public.organization_credit_ledger
    WHERE reference_type = 'stripe_sandbox_cleanup'
      AND external_reference_id = v_test_entry.external_reference_id;

    IF v_reversal_count > 0 THEN
        RAISE EXCEPTION 'ABORTADO: O credito de teste da sessao % ja possui registro de reversao no ledger.', v_test_entry.external_reference_id;
    END IF;

    -- 3. Insert auditable adjustment entry (-50.00) using original organization_id and external_reference_id (NO DELETE / NO UPDATE)
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

    -- 4. Calculate updated balance for the organization
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM public.organization_credit_ledger
    WHERE organization_id = v_test_entry.organization_id;

    RAISE NOTICE 'Reversao Auditavel Concluida com Sucesso! Ledger ID: %, External Reference ID: %, Novo Saldo: $%', v_new_ledger_id, v_test_entry.external_reference_id, v_new_balance;
END;
$$;
