-- Migration Proposal 020: Stripe Credit Top-Up & Idempotency Tracking (Fase 9.3)
-- Status: PROPOSAL ONLY (DO NOT APPLY AUTOMATICALLY)

-- 1. Ensure reference_id index exists for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_reference_id 
ON public.organization_credit_ledger (reference_id) 
WHERE reference_id IS NOT NULL;

-- 2. Secure RPC to record Stripe Credit Top-Up with strict idempotency check
CREATE OR REPLACE FUNCTION public.record_stripe_credit_topup(
    p_organization_id UUID,
    p_amount NUMERIC,
    p_stripe_session_id TEXT,
    p_package_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_new_ledger_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- Check if session ID has already been credited (idempotency check)
    SELECT id INTO v_existing_id
    FROM public.organization_credit_ledger
    WHERE reference_id = p_stripe_session_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'message', 'Stripe checkout session has already been credited.',
            'ledger_id', v_existing_id
        );
    END IF;

    -- Insert new credit transaction
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
        'credit_topup',
        'stripe_checkout_session',
        p_stripe_session_id,
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
