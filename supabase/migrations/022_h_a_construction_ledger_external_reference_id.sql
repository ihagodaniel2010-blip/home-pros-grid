-- Migration 022: Ledger External Reference ID & Secured Stripe Top-Up RPC
-- Target Project: Carpentry (ozhjvprhhsdglxokfwze / https://ozhjvprhhsdglxokfwze.supabase.co)
-- Status: PROPOSAL FOR MANUAL EXECUTION ONLY (DO NOT EXECUTE AUTOMATICALLY)

SET search_path = public;

-- 1. Add external_reference_id TEXT column to support non-UUID external session/transaction IDs (e.g. Stripe cs_test_...)
ALTER TABLE public.organization_credit_ledger 
ADD COLUMN IF NOT EXISTS external_reference_id TEXT;

-- 2. Create index for fast idempotency lookups on external_reference_id
CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_external_ref 
ON public.organization_credit_ledger (reference_type, external_reference_id) 
WHERE external_reference_id IS NOT NULL;

-- 3. Create or replace secure RPC function using external_reference_id for Stripe idempotency
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

    -- Idempotency Check: Verify if session ID has already been credited using external_reference_id
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

    -- Insert new credit transaction: reference_id IS NULL for external Stripe IDs, external_reference_id stores the Stripe session ID
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

-- 4. Lock down permissions so anonymous and authenticated users cannot invoke RPC directly
REVOKE EXECUTE ON FUNCTION public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_credit_topup(UUID, NUMERIC, TEXT, TEXT) TO service_role;
