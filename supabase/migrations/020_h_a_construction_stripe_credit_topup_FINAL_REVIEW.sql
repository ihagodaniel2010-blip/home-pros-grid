-- Migration Proposal 020 FINAL REVIEW: Stripe Credit Top-Up & Idempotency Tracking
-- Status: FINAL REVIEW PROPOSAL (DO NOT APPLY WITHOUT EXPLICIT USER CONFIRMATION)

SET search_path = public;

-- 1. Create multi-column index for fast idempotency lookups on reference_type + reference_id
CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_ref_type_id 
ON public.organization_credit_ledger (reference_type, reference_id) 
WHERE reference_id IS NOT NULL;

-- 2. Secure RPC function with strict idempotency, organization validation, and schema compatibility
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

-- 3. Lock down permissions so anonymous and authenticated users cannot invoke RPC directly from JS SDK
REVOKE EXECUTE ON FUNCTION public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT) TO service_role;
