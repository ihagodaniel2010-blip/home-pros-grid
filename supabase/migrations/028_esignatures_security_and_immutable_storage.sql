-- ==============================================================================
-- MIGRATION 028: HARDENED ELECTRONIC SIGNATURE SECURITY, SALTED SHA-256 OTP, & IMMUTABLE STORAGE
-- Project: H & A Construction LLC (ha-construction-app)
-- 
-- CRITICAL SECURITY ENHANCEMENTS:
-- 1. Cryptographically secure 6-digit OTP generation via single 4-byte pgcrypto call.
-- 2. Salted SHA-256 OTP storage (otp_salt + otp_code_hash) protecting against rainbow tables.
-- 3. REVOKE EXECUTE on privileged RPCs from anon & authenticated; GRANT ONLY to service_role.
-- 4. 60-second cooldown & 5 req/hr rate limiting per recipient.
-- 5. Explicit Purpose-Bound Verification Token lifecycle (32 hex bytes, bound to org, estimate, email & purpose, single-use, 15-min expiry).
-- 6. Audit Event Separation: OTP verification records EXCLUSIVELY 'email_verification_completed'. Contract consent & signing are logged only upon explicit user action.
-- 7. Private Storage Buckets with strict Organization-Isolated Staff RLS and zero direct public access.
-- 8. Authenticated signature deletion requiring active Org Staff session or purpose-bound 'delete_signature' verification token.
-- 9. Absolute Immutability: UPDATE and DELETE policies on signed_document_artifacts set to USING (false).
--
-- DO NOT EXECUTE AUTOMATICALLY. PREPARED FOR USER REVIEW AND APPROVAL.
-- ==============================================================================

BEGIN;

-- Enable pgcrypto extension for cryptographic random bytes & digests
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
    signature_storage_path TEXT NOT NULL, -- Private Storage path in 'signatures' bucket
    signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'typed')) DEFAULT 'drawn',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_org_client_saved_signature UNIQUE (organization_id, client_email)
);

ALTER TABLE public.client_saved_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public signatures select" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures insert" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures update" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Public signatures delete" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Allow public access to client_saved_signatures" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Staff read org client saved signatures" ON public.client_saved_signatures;
DROP POLICY IF EXISTS "Staff delete org client saved signatures" ON public.client_saved_signatures;

CREATE POLICY "Staff read org client saved signatures"
    ON public.client_saved_signatures FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff delete org client saved signatures"
    ON public.client_saved_signatures FOR DELETE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

-- ------------------------------------------------------------------------------
-- 3. CLIENT OTP AUTHENTICATION CODES TABLE (SALTED SHA-256 HASHED & PURPOSE BOUND)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_signature_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    client_email TEXT NOT NULL,
    otp_salt TEXT NOT NULL,
    otp_code_hash TEXT NOT NULL,
    verification_token TEXT,
    token_purpose TEXT NOT NULL DEFAULT 'estimate_signature', -- Purpose binding: 'estimate_signature' | 'delete_signature'
    token_expires_at TIMESTAMPTZ,
    token_used BOOLEAN NOT NULL DEFAULT FALSE,
    attempts_left INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_signature_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public direct access to OTPs" ON public.client_signature_otps;
CREATE POLICY "No public direct access to OTPs"
    ON public.client_signature_otps FOR ALL TO anon, authenticated USING (false);

-- ------------------------------------------------------------------------------
-- 4. RPC FUNCTION: REQUEST CLIENT SIGNATURE OTP (CRYPTO RANDOM, COOLDOWN, RATE-LIMITED)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_client_signature_otp(
    p_organization_id UUID,
    p_estimate_id UUID,
    p_client_email TEXT,
    p_purpose TEXT DEFAULT 'estimate_signature'
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
    v_raw_bytes BYTEA;
    v_num INT;
    v_otp_code TEXT;
    v_salt TEXT;
    v_otp_hash TEXT;
    v_expires_at TIMESTAMPTZ;
    v_recent_count INT;
    v_cooldown_active BOOLEAN;
    v_valid_purpose TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));
    v_valid_purpose := CASE WHEN LOWER(TRIM(p_purpose)) = 'delete_signature' THEN 'delete_signature' ELSE 'estimate_signature' END;

    -- 1. Validate Estimate exists and belongs to the Organization
    SELECT LOWER(TRIM(client_email)) INTO v_estimate_email
    FROM public.estimates
    WHERE id = p_estimate_id AND organization_id = p_organization_id;

    IF v_estimate_email IS NULL OR v_estimate_email <> v_clean_email THEN
        RETURN jsonb_build_object('success', false, 'message', 'Recipient email mismatch or invalid document');
    END IF;

    -- 2. Verify if a saved signature exists for this recipient
    SELECT EXISTS (
        SELECT 1 FROM public.client_saved_signatures
        WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email
    ) INTO v_has_saved_sig;

    IF NOT v_has_saved_sig THEN
        RETURN jsonb_build_object('success', false, 'message', 'No saved signature found for this recipient');
    END IF;

    -- 3. Rate Limiting: 60-second cooldown check
    SELECT EXISTS (
        SELECT 1 FROM public.client_signature_otps
        WHERE estimate_id = p_estimate_id 
          AND LOWER(client_email) = v_clean_email
          AND created_at > NOW() - INTERVAL '60 seconds'
    ) INTO v_cooldown_active;

    IF v_cooldown_active THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please wait 60 seconds before requesting another code');
    END IF;

    -- Rate Limiting: Max 5 requests per hour
    SELECT COUNT(*) INTO v_recent_count
    FROM public.client_signature_otps
    WHERE estimate_id = p_estimate_id 
      AND LOWER(client_email) = v_clean_email
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= 5 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum hourly verification attempts reached');
    END IF;

    -- 4. Cryptographically secure 6-digit OTP generation via single 4-byte pgcrypto call
    v_raw_bytes := EXTENSIONS.GEN_RANDOM_BYTES(4);
    v_num := (((GET_BYTE(v_raw_bytes, 0) & 127) * 16777216) +
              (GET_BYTE(v_raw_bytes, 1) * 65536) +
              (GET_BYTE(v_raw_bytes, 2) * 256) +
              GET_BYTE(v_raw_bytes, 3));
    v_otp_code := LPAD((v_num % 1000000)::TEXT, 6, '0');

    -- Random 16-byte salt to protect against rainbow table enumeration
    v_salt := ENCODE(EXTENSIONS.GEN_RANDOM_BYTES(16), 'hex');
    v_otp_hash := ENCODE(EXTENSIONS.DIGEST((v_salt || v_otp_code)::BYTEA, 'sha256'), 'hex');
    v_expires_at := NOW() + INTERVAL '10 minutes';

    -- Invalidate previous unverified OTPs for this estimate & email
    UPDATE public.client_signature_otps
    SET attempts_left = 0
    WHERE estimate_id = p_estimate_id AND LOWER(client_email) = v_clean_email AND verified_at IS NULL;

    -- 5. Insert Salted & Hashed OTP record with explicit token_purpose binding
    INSERT INTO public.client_signature_otps (
        organization_id,
        estimate_id,
        client_email,
        otp_salt,
        otp_code_hash,
        token_purpose,
        attempts_left,
        expires_at
    ) VALUES (
        p_organization_id,
        p_estimate_id,
        v_clean_email,
        v_salt,
        v_otp_hash,
        v_valid_purpose,
        3,
        v_expires_at
    );

    -- Log OTP request event (NO OTP CODE LOGGED)
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
        jsonb_build_object('action', 'otp_requested', 'purpose', v_valid_purpose, 'expires_at', v_expires_at)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Verification code generated successfully',
        'expires_at', v_expires_at,
        'otp_to_send', v_otp_code
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC FUNCTION: VERIFY CLIENT SIGNATURE OTP (EXCLUSIVELY LOGS email_verification_completed)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_client_signature_otp(
    p_organization_id UUID,
    p_estimate_id UUID,
    p_client_email TEXT,
    p_otp_code TEXT,
    p_purpose TEXT DEFAULT 'estimate_signature'
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
    v_token_expires TIMESTAMPTZ;
    v_valid_purpose TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));
    v_valid_purpose := CASE WHEN LOWER(TRIM(p_purpose)) = 'delete_signature' THEN 'delete_signature' ELSE 'estimate_signature' END;

    -- 1. Find latest active OTP record matching organization, estimate, email, and purpose
    SELECT * INTO v_otp_record
    FROM public.client_signature_otps
    WHERE organization_id = p_organization_id
      AND estimate_id = p_estimate_id
      AND LOWER(client_email) = v_clean_email
      AND token_purpose = v_valid_purpose
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_otp_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active verification code found for this purpose. Please request a new code.');
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

    -- 4. Compute Salted SHA-256 Hash of Submitted OTP
    v_submitted_hash := ENCODE(EXTENSIONS.DIGEST((v_otp_record.otp_salt || TRIM(p_otp_code))::BYTEA, 'sha256'), 'hex');

    IF v_submitted_hash <> v_otp_record.otp_code_hash THEN
        UPDATE public.client_signature_otps 
        SET attempts_left = attempts_left - 1 
        WHERE id = v_otp_record.id;
        
        RETURN jsonb_build_object(
            'success', false, 
            'message', FORMAT('Invalid verification code. %s attempt(s) remaining.', v_otp_record.attempts_left - 1)
        );
    END IF;

    -- 5. Generate cryptographically secure single-use verification token bound strictly to purpose
    v_token := ENCODE(EXTENSIONS.GEN_RANDOM_BYTES(32), 'hex');
    v_token_expires := NOW() + INTERVAL '15 minutes';

    UPDATE public.client_signature_otps
    SET verified_at = NOW(),
        verification_token = v_token,
        token_expires_at = v_token_expires,
        token_used = FALSE
    WHERE id = v_otp_record.id;

    -- 6. Retrieve saved signature record
    SELECT * INTO v_saved_sig
    FROM public.client_saved_signatures
    WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email;

    IF v_saved_sig IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saved signature record not found.');
    END IF;

    -- STRICT RULE 1 FIX: Log EXCLUSIVELY 'email_verification_completed'. NO 'electronic_consent_accepted' HERE!
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
        'email_verification_completed',
        'client',
        v_clean_email,
        jsonb_build_object('auth_method', '6_digit_email_otp', 'purpose', v_valid_purpose, 'otp_id', v_otp_record.id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'verification_token', v_token,
        'token_purpose', v_valid_purpose,
        'signature_storage_path', v_saved_sig.signature_storage_path,
        'signature_type', v_saved_sig.signature_type,
        'signer_name', v_saved_sig.client_name,
        'signer_email', v_saved_sig.client_email
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC FUNCTION: AUTHENTICATED DELETE SAVED SIGNATURE (STRICT PURPOSE CHECK)
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
    v_token_record RECORD;
BEGIN
    v_clean_email := LOWER(TRIM(p_client_email));

    -- 1. Check if active user is staff member of organization
    SELECT EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE user_id = auth.uid() 
          AND organization_id = p_organization_id 
          AND status = 'active'
    ) INTO v_is_staff;

    -- 2. STRICT PURPOSE CHECK: verification_token MUST have token_purpose = 'delete_signature'
    IF p_verification_token IS NOT NULL THEN
        SELECT * INTO v_token_record
        FROM public.client_signature_otps
        WHERE organization_id = p_organization_id
          AND LOWER(client_email) = v_clean_email
          AND verification_token = p_verification_token
          AND token_purpose = 'delete_signature' -- MUST MATCH EXPLICIT PURPOSE!
          AND verified_at IS NOT NULL
          AND token_used = FALSE
          AND token_expires_at > NOW();
    END IF;

    -- Reject unauthenticated deletion attempts or tokens issued for other purposes (e.g. estimate_signature)
    IF NOT v_is_staff AND v_token_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Unauthorized: Deletion requires active staff session or a valid verification token issued specifically for deletion.'
        );
    END IF;

    -- Invalidate token after single use
    IF v_token_record.id IS NOT NULL THEN
        UPDATE public.client_signature_otps SET token_used = TRUE WHERE id = v_token_record.id;
    END IF;

    DELETE FROM public.client_saved_signatures
    WHERE organization_id = p_organization_id AND LOWER(client_email) = v_clean_email;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No saved signature found to delete');
    END IF;

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

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electronic_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_document_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read org document_versions" ON public.document_versions FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff read org electronic_signatures" ON public.electronic_signatures FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff read org document_signature_events" ON public.document_signature_events FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff read org signed_document_artifacts" ON public.signed_document_artifacts FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "No update on signed artifacts" ON public.signed_document_artifacts;
CREATE POLICY "No update on signed artifacts" ON public.signed_document_artifacts FOR UPDATE TO PUBLIC USING (false);

DROP POLICY IF EXISTS "No delete on signed artifacts" ON public.signed_document_artifacts;
CREATE POLICY "No delete on signed artifacts" ON public.signed_document_artifacts FOR DELETE TO PUBLIC USING (false);

-- ------------------------------------------------------------------------------
-- 8. SUPABASE STORAGE BUCKETS & STRICT ORGANIZATION-ISOLATED RLS POLICIES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false),
       ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Clean up any legacy or broad permissive policies on storage.objects
DROP POLICY IF EXISTS "Private signatures bucket read" ON storage.objects;
DROP POLICY IF EXISTS "Private documents bucket read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public signatures select" ON storage.objects;
DROP POLICY IF EXISTS "Allow public signatures insert" ON storage.objects;
DROP POLICY IF EXISTS "Staff org signatures storage read" ON storage.objects;
DROP POLICY IF EXISTS "Staff org documents storage read" ON storage.objects;
DROP POLICY IF EXISTS "No direct public access to signatures" ON storage.objects;
DROP POLICY IF EXISTS "No direct public access to documents" ON storage.objects;

-- Organization-Isolated Read Policy for Staff (Path structure: {org_id}/...)
CREATE POLICY "Staff org signatures storage read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'signatures' AND
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() 
              AND ou.status = 'active'
              AND (storage.foldername(name))[1] = ou.organization_id::text
        )
    );

CREATE POLICY "Staff org documents storage read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() 
              AND ou.status = 'active'
              AND (storage.foldername(name))[1] = ou.organization_id::text
        )
    );

-- Absolute block on direct public / anonymous storage access
CREATE POLICY "No direct public access to signatures" ON storage.objects
    FOR ALL TO anon USING (false);

CREATE POLICY "No direct public access to documents" ON storage.objects
    FOR ALL TO anon USING (false);

-- ------------------------------------------------------------------------------
-- 9. STRICT PRIVILEGED RPC PERMISSION REVOCATION
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.request_client_signature_otp(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_client_signature_otp(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_client_saved_signature(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.request_client_signature_otp(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_client_signature_otp(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_client_saved_signature(UUID, TEXT, TEXT) TO service_role;

COMMIT;
