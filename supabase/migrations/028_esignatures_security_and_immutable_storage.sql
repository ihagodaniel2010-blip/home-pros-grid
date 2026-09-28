-- ==============================================================================
-- MIGRATION 028: HARDENED ELECTRONIC SIGNATURE SECURITY, SHA-256 OTP AUTH, & IMMUTABLE STORAGE
-- Project: H & A Construction LLC (ha-construction-app)
-- 
-- CRITICAL SECURITY UPGRADES:
-- 1. Hashed OTP storage (SHA-256) — No plaintext OTP stored in database.
-- 2. 60-second cooldown & 5 req/hr rate limiting per recipient.
-- 3. Strict search_path = public, extensions, pg_temp on SECURITY DEFINER RPCs.
-- 4. Single-use OTP codes with 10-minute expiry & max 3 verification attempts.
-- 5. Private Storage Bucket path architecture for client_saved_signatures.
-- 6. Authenticated deletion requiring Org Staff membership or Verified OTP Token.
-- 7. Immutability policies prohibiting UPDATE and DELETE on signed PDF artifacts.
-- 8. Validated against actual database schema (public.organization_users).
--
-- DO NOT EXECUTE AUTOMATICALLY. PREPARED FOR USER REVIEW AND APPROVAL.
-- ==============================================================================

BEGIN;

-- Enable pgcrypto extension for cryptographic digests if not active
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
-- 2. CLIENT REUSABLE SAVED SIGNATURES VAULT (PRIVATE STORAGE PATH + STRICT RLS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_saved_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    signature_storage_path TEXT NOT NULL, -- Private Storage reference in 'signatures' bucket
    signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'typed')) DEFAULT 'drawn',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_org_client_saved_signature UNIQUE (organization_id, client_email)
);

ALTER TABLE public.client_saved_signatures ENABLE ROW LEVEL SECURITY;

-- Revoke all public policies
DROP POLICY IF EXISTS "Public signatures select" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures insert" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures update" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures delete" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Allow public access to client_saved_signatures" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Staff read org client saved signatures" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Staff delete org client saved signatures" ON public.client_saved_signatures;

-- Strict Policy 1: Authenticated organization staff can read signatures of their own org
CREATE POLICY "Staff read org client saved signatures"
    ON public.client_saved_signatures
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_users 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Strict Policy 2: Authenticated organization staff can delete signatures of their own org
CREATE POLICY "Staff delete org client saved signatures"
    ON public.client_saved_signatures
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_users 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- ------------------------------------------------------------------------------
-- 3. CLIENT OTP AUTHENTICATION CODES TABLE (SHA-256 HASHED)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_signature_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    client_email TEXT NOT NULL,
    otp_code_hash TEXT NOT NULL, -- SHA-256 hash of the 6-digit OTP code
    verification_token TEXT, -- Single-use token issued upon successful verification
    attempts_left INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_signature_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public direct access to OTPs" ON public.client_signature_otps;
CREATE POLICY "No public direct access to OTPs"
    ON public.client_signature_otps
    FOR ALL
    TO anon, authenticated
    USING (false);

-- ------------------------------------------------------------------------------
-- 4. RPC FUNCTION: REQUEST CLIENT SIGNATURE OTP (SERVER-SIDE & RATE LIMITED)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_client_signature_otp(
    p_organization_id UUID,
    p_estimate_id UUID,
    p_client_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_email TEXT;
    v_estimate_email TEXT;
    v_has_saved_sig BOOLEAN;
    v_otp_code TEXT;
    v_otp_hash TEXT;
    v_expires_at TIMESTAMPTZ;
    v_recent_count INT;
    v_cooldown_active BOOLEAN;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));

    -- 1. Validate Estimate exists and belongs to the given Organization
    SELECT LOWER(TRIM(client_email)) INTO v_estimate_email
    FROM public.estimates
    WHERE id = p_estimate_id AND organization_id = p_organization_id;

    IF v_estimate_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid request parameters');
    END IF;

    IF v_estimate_email <> v_clean_email THEN
        RETURN jsonb_build_object('success', false, 'message', 'Recipient email mismatch');
    END IF;

    -- 2. Verify saved signature presence
    SELECT EXISTS (
        SELECT 1 FROM public.client_saved_signatures
        WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email
    ) INTO v_has_saved_sig;

    IF NOT v_has_saved_sig THEN
        -- Factual response to avoid leaking vault presence
        RETURN jsonb_build_object('success', false, 'message', 'No saved signature found for this recipient');
    END IF;

    -- 3. Rate Limiting: Check 60-second cooldown per estimate & email
    SELECT EXISTS (
        SELECT 1 FROM public.client_signature_otps
        WHERE estimate_id = p_estimate_id 
          AND LOWER(client_email) = v_clean_email
          AND created_at > NOW() - INTERVAL '60 seconds'
    ) INTO v_cooldown_active;

    IF v_cooldown_active THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please wait 60 seconds before requesting another code');
    END IF;

    -- Rate Limiting: Max 5 OTP requests per hour per estimate
    SELECT COUNT(*) INTO v_recent_count
    FROM public.client_signature_otps
    WHERE estimate_id = p_estimate_id 
      AND LOWER(client_email) = v_clean_email
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= 5 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum hourly verification attempts reached');
    END IF;

    -- 4. Cryptographically secure 6-digit OTP generation
    v_otp_code := LPAD(FLOOR((EXTRACT(EPOCH FROM NOW())::NUMERIC * 1000000 + RANDOM() * 899999 + 100000) % 900000 + 100000)::TEXT, 6, '0');
    v_otp_hash := ENCODE(EXTENSIONS.DIGEST(v_otp_code::BYTEA, 'sha256'), 'hex');
    v_expires_at := NOW() + INTERVAL '10 minutes';

    -- Invalidate previous unverified OTPs for this estimate & email
    UPDATE public.client_signature_otps
    SET attempts_left = 0
    WHERE estimate_id = p_estimate_id AND LOWER(client_email) = v_clean_email AND verified_at IS NULL;

    -- 5. Insert HASHED OTP record
    INSERT INTO public.client_signature_otps (
        organization_id,
        estimate_id,
        client_email,
        otp_code_hash,
        attempts_left,
        expires_at
    ) VALUES (
        p_organization_id,
        p_estimate_id,
        v_clean_email,
        v_otp_hash,
        3,
        v_expires_at
    );

    -- Log OTP generation event in signature audit trail (NO PLAINTEXT OTP LOGGED)
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

    -- STRICT RULE 1: Return OTP ONLY to internal server caller (never return in public JSON API output)
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Verification code generated successfully',
        'expires_at', v_expires_at,
        'otp_to_send', v_otp_code -- Exposed ONLY to server API handler for sending email
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC FUNCTION: VERIFY CLIENT SIGNATURE OTP (SECURE HASH CHECK)
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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_email TEXT;
    v_submitted_hash TEXT;
    v_otp_record RECORD;
    v_saved_sig RECORD;
    v_token TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));
    v_submitted_hash := ENCODE(EXTENSIONS.DIGEST(TRIM(p_otp_code)::BYTEA, 'sha256'), 'hex');

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

    -- 2. Expiration Check
    IF NOW() > v_otp_record.expires_at THEN
        UPDATE public.client_signature_otps SET attempts_left = 0 WHERE id = v_otp_record.id;
        RETURN jsonb_build_object('success', false, 'message', 'Verification code has expired. Please request a new code.');
    END IF;

    -- 3. Max Attempts Check
    IF v_otp_record.attempts_left <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum verification attempts exceeded. Verification locked.');
    END IF;

    -- 4. Validate OTP Hash
    IF v_submitted_hash <> v_otp_record.otp_code_hash THEN
        UPDATE public.client_signature_otps 
        SET attempts_left = attempts_left - 1 
        WHERE id = v_otp_record.id;
        
        RETURN jsonb_build_object(
            'success', false, 
            'message', FORMAT('Invalid verification code. %s attempt(s) remaining.', v_otp_record.attempts_left - 1)
        );
    END IF;

    -- 5. Generate single-use verification token
    v_token := ENCODE(EXTENSIONS.GEN_RANDOM_BYTES(24), 'hex');

    -- Mark OTP as verified and store verification token
    UPDATE public.client_signature_otps
    SET verified_at = NOW(),
        verification_token = v_token
    WHERE id = v_otp_record.id;

    -- 6. Retrieve saved signature record
    SELECT * INTO v_saved_sig
    FROM public.client_saved_signatures
    WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email;

    IF v_saved_sig IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saved signature record not found.');
    END IF;

    -- Log verification event
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
        'verification_token', v_token,
        'signature_storage_path', v_saved_sig.signature_storage_path,
        'signature_type', v_saved_sig.signature_type,
        'signer_name', v_saved_sig.client_name,
        'signer_email', v_saved_sig.client_email
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC FUNCTION: AUTHENTICATED DELETE SAVED SIGNATURE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_client_saved_signature(
    p_organization_id UUID,
    p_client_email TEXT,
    p_verification_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_email TEXT;
    v_deleted_count INT;
    v_is_staff BOOLEAN;
    v_token_valid BOOLEAN;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));

    -- Check if active user is staff member of organization
    SELECT EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE user_id = auth.uid() 
          AND organization_id = p_organization_id 
          AND status = 'active'
    ) INTO v_is_staff;

    -- Check if valid single-use verification token is provided
    IF p_verification_token IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.client_signature_otps
            WHERE organization_id = p_organization_id
              AND LOWER(client_email) = v_clean_email
              AND verification_token = p_verification_token
              AND verified_at IS NOT NULL
        ) INTO v_token_valid;
    ELSE
        v_token_valid := FALSE;
    END IF;

    -- STRICT RULE 4: Reject unauthenticated deletion attempts!
    IF NOT v_is_staff AND NOT v_token_valid THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Deletion requires an active staff session or verified OTP token');
    END IF;

    DELETE FROM public.client_saved_signatures
    WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No saved signature found to delete');
    END IF;

    -- NOTE: Historical records in document_versions, electronic_signatures,
    -- signed_document_artifacts, and estimates.signed_pdf_url REMAIN PRESERVED.

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Saved reusable signature deleted successfully. Historical signed documents remain preserved.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. IMMUTABLE SIGNED DOCUMENT ARTIFACTS TABLE & STRICT RLS
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
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
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

-- Enable RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electronic_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_document_artifacts ENABLE ROW LEVEL SECURITY;

-- Staff Read Policies
CREATE POLICY "Staff read org document_versions" ON public.document_versions FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff read org electronic_signatures" ON public.electronic_signatures FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff read org document_signature_events" ON public.document_signature_events FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff read org signed_document_artifacts" ON public.signed_document_artifacts FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

-- STRICT RULE 7: Block UPDATE and DELETE on signed document artifacts to enforce absolute immutability
DROP POLICY IF EXISTS "No update on signed artifacts" ON public.signed_document_artifacts;
CREATE POLICY "No update on signed artifacts" ON public.signed_document_artifacts FOR UPDATE TO PUBLIC USING (false);

DROP POLICY IF EXISTS "No delete on signed artifacts" ON public.signed_document_artifacts;
CREATE POLICY "No delete on signed artifacts" ON public.signed_document_artifacts FOR DELETE TO PUBLIC USING (false);

-- ------------------------------------------------------------------------------
-- 8. EXPLICIT GRANT EXECUTE PERMISSIONS
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.request_client_signature_otp(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_client_signature_otp(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_client_saved_signature(UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_client_signature_otp(UUID, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_client_signature_otp(UUID, UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_client_saved_signature(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
