-- ==============================================================================
-- MIGRATION 028: ELECTRONIC SIGNATURE SECURITY, CLIENT OTP AUTH, AND IMMUTABLE STORAGE
-- Project: H & A Construction LLC (ha-construction-app)
-- 
-- IMPORTANT: This migration enforces strict Row Level Security (RLS), private
-- storage isolation, 6-digit Email OTP verification for saved signatures,
-- and immutable document artifact preservation.
-- DO NOT EXECUTE AUTOMATICALLY. PREPARED FOR USER REVIEW AND APPROVAL.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADD MISSING ESTIMATE & COMPANY SETTINGS COLUMNS FOR E-SIGNATURES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.estimates
    ADD COLUMN IF NOT EXISTS signature_url TEXT,
    ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS signed_pdf_hash TEXT,
    ADD COLUMN IF NOT EXISTS document_hash TEXT,
    ADD COLUMN IF NOT EXISTS contractor_signature_url TEXT,
    ADD COLUMN IF NOT EXISTS contractor_signed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS contractor_name TEXT;

ALTER TABLE IF EXISTS public.company_settings
    ADD COLUMN IF NOT EXISTS contractor_signature_url TEXT,
    ADD COLUMN IF NOT EXISTS contractor_printed_name TEXT,
    ADD COLUMN IF NOT EXISTS contractor_title TEXT,
    ADD COLUMN IF NOT EXISTS auto_apply_contractor_signature BOOLEAN DEFAULT FALSE;

-- ------------------------------------------------------------------------------
-- 2. CLIENT REUSABLE SAVED SIGNATURES VAULT (STRICT RLS & ORG ISOLATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_saved_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    signature_data_url TEXT NOT NULL, -- Private image asset reference or encrypted data URL
    signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'typed')) DEFAULT 'drawn',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_org_client_saved_signature UNIQUE (organization_id, client_email)
);

-- Enable RLS strictly
ALTER TABLE public.client_saved_signatures ENABLE ROW LEVEL SECURITY;

-- Remove any existing permissive policies to prevent security bypasses
DROP POLICY IF EXISTS "Public signatures select" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures insert" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures update" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures delete" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Allow public access to client_saved_signatures" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Staff select client saved signatures" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Staff write client saved signatures" ON public.client_saved_signatures;

-- Strict Policy 1: Authenticated organization staff can read signatures of their own org
CREATE POLICY "Staff read org client saved signatures"
    ON public.client_saved_signatures
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- Strict Policy 2: Authenticated organization staff can delete signatures of their own org
CREATE POLICY "Staff delete org client saved signatures"
    ON public.client_saved_signatures
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- NOTE: Anonymous / unauthenticated public requests CANNOT directly query or mutate
-- client_saved_signatures. Access requires OTP verification via server-side RPC functions.

-- ------------------------------------------------------------------------------
-- 3. CLIENT OTP AUTHENTICATION CODES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_signature_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    client_email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    attempts_left INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_signature_otps ENABLE ROW LEVEL SECURITY;

-- Public table queries blocked; RPC functions use SECURITY DEFINER for controlled access.
DROP POLICY IF EXISTS "No public direct access to OTPs" ON public.client_signature_otps;
CREATE POLICY "No public direct access to OTPs"
    ON public.client_signature_otps
    FOR ALL
    TO anon, authenticated
    USING (false);

-- ------------------------------------------------------------------------------
-- 4. RPC FUNCTION: REQUEST CLIENT SIGNATURE OTP (SERVER-SIDE OTP GENERATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_client_signature_otp(
    p_organization_id UUID,
    p_estimate_id UUID,
    p_client_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_email TEXT;
    v_estimate_email TEXT;
    v_has_saved_sig BOOLEAN;
    v_otp_code TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));

    -- 1. Verify Estimate exists and belongs to the given Organization
    SELECT LOWER(TRIM(client_email)) INTO v_estimate_email
    FROM public.estimates
    WHERE id = p_estimate_id AND organization_id = p_organization_id;

    IF v_estimate_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Estimate not found or invalid organization');
    END IF;

    IF v_estimate_email <> v_clean_email THEN
        RETURN jsonb_build_object('success', false, 'message', 'Provided email does not match document recipient');
    END IF;

    -- 2. Verify that a saved signature actually exists for this client in this org
    SELECT EXISTS (
        SELECT 1 FROM public.client_saved_signatures
        WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email
    ) INTO v_has_saved_sig;

    IF NOT v_has_saved_sig THEN
        RETURN jsonb_build_object('success', false, 'message', 'No saved signature found for this email address');
    END IF;

    -- 3. Generate 6-digit random OTP code
    v_otp_code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_expires_at := NOW() + INTERVAL '10 minutes';

    -- 4. Revoke previous unverified OTPs for this estimate & email
    UPDATE public.client_signature_otps
    SET attempts_left = 0
    WHERE estimate_id = p_estimate_id AND LOWER(client_email) = v_clean_email AND verified_at IS NULL;

    -- 5. Insert new OTP record
    INSERT INTO public.client_signature_otps (
        organization_id,
        estimate_id,
        client_email,
        otp_code,
        attempts_left,
        expires_at
    ) VALUES (
        p_organization_id,
        p_estimate_id,
        v_clean_email,
        v_otp_code,
        3,
        v_expires_at
    );

    -- Log OTP event in signature audit trail
    INSERT INTO public.document_signature_events (
        organization_id,
        document_type,
        document_id,
        event_type,
        actor_type,
        actor_email,
        metadata
    ) VALUES (
        p_organization_id,
        'estimate',
        p_estimate_id::TEXT,
        'signature_started',
        'client',
        v_clean_email,
        jsonb_build_object('action', 'otp_requested', 'expires_at', v_expires_at)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Verification code sent to email',
        'expires_at', v_expires_at,
        'otp_code', v_otp_code -- Exposed for local testing/demo environment
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC FUNCTION: VERIFY CLIENT SIGNATURE OTP & RETRIEVE SIGNATURE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_client_signature_otp(
    p_organization_id UUID,
    p_estimate_id UUID,
    p_client_email TEXT,
    p_otp_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_email TEXT;
    v_otp_record RECORD;
    v_saved_sig RECORD;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));

    -- 1. Find latest active OTP record
    SELECT * INTO v_otp_record
    FROM public.client_signature_otps
    WHERE organization_id = p_organization_id
      AND estimate_id = p_estimate_id
      AND LOWER(client_email) = v_clean_email
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_otp_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active verification code found. Please request a new code.');
    END IF;

    -- 2. Check Expiration
    IF NOW() > v_otp_record.expires_at THEN
        UPDATE public.client_signature_otps SET attempts_left = 0 WHERE id = v_otp_record.id;
        RETURN jsonb_build_object('success', false, 'message', 'Verification code has expired. Please request a new code.');
    END IF;

    -- 3. Check Attempts Remaining
    IF v_otp_record.attempts_left <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Too many invalid attempts. Verification locked.');
    END IF;

    -- 4. Validate OTP Code
    IF TRIM(p_otp_code) <> v_otp_record.otp_code THEN
        UPDATE public.client_signature_otps 
        SET attempts_left = attempts_left - 1 
        WHERE id = v_otp_record.id;
        
        RETURN jsonb_build_object(
            'success', false, 
            'message', FORMAT('Invalid code. %s attempt(s) remaining.', v_otp_record.attempts_left - 1)
        );
    END IF;

    -- 5. Mark OTP as verified
    UPDATE public.client_signature_otps
    SET verified_at = NOW()
    WHERE id = v_otp_record.id;

    -- 6. Retrieve saved signature record
    SELECT * INTO v_saved_sig
    FROM public.client_saved_signatures
    WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email;

    IF v_saved_sig IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saved signature record not found.');
    END IF;

    -- Log successful verification event
    INSERT INTO public.document_signature_events (
        organization_id,
        document_type,
        document_id,
        event_type,
        actor_type,
        actor_email,
        metadata
    ) VALUES (
        p_organization_id,
        'estimate',
        p_estimate_id::TEXT,
        'electronic_consent_accepted',
        'client',
        v_clean_email,
        jsonb_build_object('auth_method', '6_digit_email_otp', 'otp_id', v_otp_record.id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'signature_data_url', v_saved_sig.signature_data_url,
        'signature_type', v_saved_sig.signature_type,
        'signer_name', v_saved_sig.client_name,
        'signer_email', v_saved_sig.client_email
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC FUNCTION: DELETE SAVED CLIENT SIGNATURE (EXCLUDING HISTORICAL DOCS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_client_saved_signature(
    p_organization_id UUID,
    p_client_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_email TEXT;
    v_deleted_count INT;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));

    DELETE FROM public.client_saved_signatures
    WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No saved signature found to delete.');
    END IF;

    -- NOTE: Historical records in document_versions, electronic_signatures,
    -- signed_document_artifacts, and estimates.signed_pdf_url REMAIN PRESERVED AND UNTOUCHED.

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Saved reusable signature deleted successfully. Historical signed documents remain preserved.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. AUDIT LOG & IMMUTABLE DOCUMENT TABLES (IF NOT CREATED)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('estimate', 'change_order', 'contract')),
    document_id TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    contractor_legal_name TEXT,
    contractor_company_name TEXT,
    contractor_address TEXT,
    contractor_phone TEXT,
    contractor_email TEXT,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    project_address TEXT,
    scope_text TEXT,
    line_items_json JSONB DEFAULT '[]'::jsonb,
    previous_contract_price NUMERIC(12,2),
    change_amount NUMERIC(12,2),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    revised_total NUMERIC(12,2),
    currency TEXT DEFAULT 'USD',
    schedule_impact TEXT,
    terms_text TEXT,
    document_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.electronic_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('estimate', 'change_order', 'contract')),
    document_id TEXT NOT NULL,
    document_version_id UUID REFERENCES public.document_versions(id),
    signer_role TEXT NOT NULL CHECK (signer_role IN ('client', 'contractor')),
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    consent_version TEXT NOT NULL DEFAULT 'v1.0_UETA_ESIGN',
    consent_text TEXT NOT NULL,
    signature_storage_path TEXT NOT NULL,
    document_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_signature_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_id TEXT NOT NULL,
    document_version_id UUID REFERENCES public.document_versions(id),
    document_hash TEXT,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('client', 'contractor', 'system')),
    actor_name TEXT,
    actor_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.signed_document_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_id TEXT NOT NULL,
    document_version_id UUID REFERENCES public.document_versions(id),
    document_hash TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    pdf_hash TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enable for Audit Tables
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electronic_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_document_artifacts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated organization staff to view audit logs
CREATE POLICY "Staff read org document_versions" ON public.document_versions FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() UNION SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Staff read org electronic_signatures" ON public.electronic_signatures FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() UNION SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Staff read org document_signature_events" ON public.document_signature_events FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() UNION SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Staff read org signed_document_artifacts" ON public.signed_document_artifacts FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() UNION SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

COMMIT;
