-- Migration Proposal 020 REVIEWED: Stripe Credit Top-Up & Idempotency Tracking
-- Status: REVIEWED PROPOSAL (DO NOT APPLY WITHOUT EXPLICIT USER CONFIRMATION)

SET search_path = public;

-- 1. Create index for fast idempotency check on reference_id if not exists
CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_reference_id 
ON public.organization_credit_ledger (reference_id) 
WHERE reference_id IS NOT NULL;

-- 2. Secure RPC function with strict idempotency and validation
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
BEGIN
    -- Validation: Validate input parameters
    IF p_organization_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'organization_id is required.');
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'amount must be greater than zero.');
    END IF;

    IF p_stripe_session_id IS NULL OR TRIM(p_stripe_session_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'stripe_session_id is required.');
    END IF;

    -- Idempotency Check: Verify if session ID has already been credited
    SELECT id INTO v_existing_id
    FROM public.organization_credit_ledger
    WHERE reference_id = TRIM(p_stripe_session_id)
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
