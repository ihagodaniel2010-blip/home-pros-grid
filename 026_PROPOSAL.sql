-- ============================================================================
-- PROPOSTA DE MIGRAÇÃO 026 (VERSÃO CONSOLIDADA E BLINDADA)
-- TÍTULO: PUBLIC CLIENT PORTAL RPCs WITH SERVER-SIDE SIGNED URL GENERATION
-- PROJETO: Carpentry (H&A Construction)
-- DATA: 2026-09-26
-- INSTRUÇÕES: Copiar e executar no Supabase SQL Editor
-- EXECUÇÃO AUTOMÁTICA: NÃO (SQL EXECUTED: NO)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RPC: get_public_estimate_extras(p_token text)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_estimate_extras(text);
CREATE OR REPLACE FUNCTION public.get_public_estimate_extras(p_token text)
RETURNS TABLE (
    id uuid,
    organization_id uuid,
    service_job_id uuid,
    estimate_id uuid,
    title text,
    description text,
    reason text,
    amount numeric,
    schedule_impact_days text,
    status text,
    public_token text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_token text := trim(p_token);
    v_estimate_id uuid;
    v_job_id uuid;
    v_org_id uuid;
BEGIN
    IF v_clean_token IS NULL OR v_clean_token = '' OR v_clean_token LIKE 'lead_%' OR v_clean_token LIKE '%@%' THEN
        RETURN;
    END IF;

    -- Validar token público exclusivo (NÃO aceita UUID interno da Estimate)
    SELECT est.id, est.organization_id INTO v_estimate_id, v_org_id
    FROM public.estimates est
    WHERE (est.access_token = v_clean_token OR (COALESCE(est.public_token, '') = v_clean_token AND v_clean_token <> ''))
      AND (est.access_token_revoked IS NOT TRUE)
    LIMIT 1;

    IF v_estimate_id IS NULL THEN
        RETURN;
    END IF;

    -- Resolver o Job correspondente na mesma organização
    SELECT j.id INTO v_job_id
    FROM public.service_jobs j
    WHERE (j.estimate_id = v_estimate_id)
      AND j.organization_id = v_org_id
    LIMIT 1;

    RETURN QUERY
    SELECT 
        e.id,
        e.organization_id,
        e.service_job_id,
        e.estimate_id,
        COALESCE(e.title, e.description) AS title,
        e.description,
        trim(regexp_replace(regexp_replace(COALESCE(e.reason, ''), '\[media:[^\]]+\]', '', 'g'), 'data:image/[^;]+;base64,[A-Za-z0-9+/=]+', '', 'g')) AS reason,
        e.amount,
        COALESCE(e.schedule_impact, e.schedule_impact_days, '') AS schedule_impact_days,
        e.status,
        e.public_token,
        e.created_at
    FROM public.service_extras e
    WHERE e.organization_id = v_org_id
      AND (e.estimate_id = v_estimate_id OR (v_job_id IS NOT NULL AND e.service_job_id = v_job_id))
    ORDER BY e.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. RPC: get_public_client_materials(p_token text)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_client_materials(text);
CREATE OR REPLACE FUNCTION public.get_public_client_materials(p_token text)
RETURNS TABLE (
    id uuid,
    organization_id uuid,
    service_job_id uuid,
    estimate_id uuid,
    vendor text,
    notes text,
    amount numeric,
    receipt_date date,
    bill_to_client boolean,
    status text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_token text := trim(p_token);
    v_estimate_id uuid;
    v_job_id uuid;
    v_org_id uuid;
BEGIN
    IF v_clean_token IS NULL OR v_clean_token = '' OR v_clean_token LIKE 'lead_%' OR v_clean_token LIKE '%@%' THEN
        RETURN;
    END IF;

    SELECT est.id, est.organization_id INTO v_estimate_id, v_org_id
    FROM public.estimates est
    WHERE (est.access_token = v_clean_token OR (COALESCE(est.public_token, '') = v_clean_token AND v_clean_token <> ''))
      AND (est.access_token_revoked IS NOT TRUE)
    LIMIT 1;

    IF v_estimate_id IS NULL THEN
        RETURN;
    END IF;

    SELECT j.id INTO v_job_id
    FROM public.service_jobs j
    WHERE (j.estimate_id = v_estimate_id)
      AND j.organization_id = v_org_id
    LIMIT 1;

    RETURN QUERY
    SELECT 
        r.id,
        r.organization_id,
        r.service_job_id,
        r.estimate_id,
        r.vendor,
        r.notes,
        r.amount,
        r.receipt_date,
        r.bill_to_client,
        r.status,
        r.created_at
    FROM public.receipts r
    WHERE r.organization_id = v_org_id
      AND (r.estimate_id = v_estimate_id OR (v_job_id IS NOT NULL AND r.service_job_id = v_job_id))
      AND r.status = 'active'
      AND (r.bill_to_client = true OR r.material_responsibility = 'client' OR r.expense_category = 'client_reimbursable')
      AND (r.material_responsibility IS NULL OR r.material_responsibility != 'company')
    ORDER BY r.receipt_date DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RPC: get_public_job_media(p_token text)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_job_media(text);
CREATE OR REPLACE FUNCTION public.get_public_job_media(p_token text)
RETURNS TABLE (
    id uuid,
    organization_id uuid,
    service_job_id uuid,
    estimate_id uuid,
    media_type text,
    file_name text,
    mime_type text,
    file_size_bytes numeric,
    caption text,
    visible_to_client boolean,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_token text := trim(p_token);
    v_estimate_id uuid;
    v_job_id uuid;
    v_org_id uuid;
BEGIN
    IF v_clean_token IS NULL OR v_clean_token = '' OR v_clean_token LIKE 'lead_%' OR v_clean_token LIKE '%@%' THEN
        RETURN;
    END IF;

    SELECT est.id, est.organization_id INTO v_estimate_id, v_org_id
    FROM public.estimates est
    WHERE (est.access_token = v_clean_token OR (COALESCE(est.public_token, '') = v_clean_token AND v_clean_token <> ''))
      AND (est.access_token_revoked IS NOT TRUE)
    LIMIT 1;

    IF v_estimate_id IS NULL THEN
        RETURN;
    END IF;

    SELECT j.id INTO v_job_id
    FROM public.service_jobs j
    WHERE (j.estimate_id = v_estimate_id)
      AND j.organization_id = v_org_id
    LIMIT 1;

    RETURN QUERY
    SELECT 
        m.id,
        m.organization_id,
        m.service_job_id,
        m.estimate_id,
        m.media_type,
        m.file_name,
        m.mime_type,
        m.file_size_bytes,
        m.caption,
        m.visible_to_client,
        m.created_at
    FROM public.service_job_media m
    WHERE m.organization_id = v_org_id
      AND (m.estimate_id = v_estimate_id OR (v_job_id IS NOT NULL AND m.service_job_id = v_job_id))
      AND m.visible_to_client = true -- APENAS MÍDIAS CLIENT VISIBLE (EXCLUI ADMIN ONLY)
    ORDER BY m.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC: get_public_client_payments(p_token text)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_client_payments(text);
CREATE OR REPLACE FUNCTION public.get_public_client_payments(p_token text)
RETURNS TABLE (
    id uuid,
    organization_id uuid,
    service_job_id uuid,
    estimate_id uuid,
    customer_name text,
    amount numeric,
    method text,
    payment_date date,
    note text,
    status text,
    receipt_status text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_token text := trim(p_token);
    v_estimate_id uuid;
    v_job_id uuid;
    v_org_id uuid;
BEGIN
    IF v_clean_token IS NULL OR v_clean_token = '' OR v_clean_token LIKE 'lead_%' OR v_clean_token LIKE '%@%' THEN
        RETURN;
    END IF;

    SELECT est.id, est.organization_id INTO v_estimate_id, v_org_id
    FROM public.estimates est
    WHERE (est.access_token = v_clean_token OR (COALESCE(est.public_token, '') = v_clean_token AND v_clean_token <> ''))
      AND (est.access_token_revoked IS NOT TRUE)
    LIMIT 1;

    IF v_estimate_id IS NULL THEN
        RETURN;
    END IF;

    SELECT j.id INTO v_job_id
    FROM public.service_jobs j
    WHERE (j.estimate_id = v_estimate_id)
      AND j.organization_id = v_org_id
    LIMIT 1;

    RETURN QUERY
    SELECT 
        p.id,
        p.organization_id,
        p.service_job_id,
        p.estimate_id,
        p.customer_name,
        p.amount,
        p.method,
        p.payment_date,
        CASE 
            WHEN p.note LIKE '[PAGAMENTO DE MATERIAIS%' OR p.note LIKE '[PAGAMENTO DO CONTRATO%' THEN p.note
            ELSE NULL
        END AS note,
        p.status,
        p.receipt_status,
        p.created_at
    FROM public.estimate_payments_manual p
    WHERE p.organization_id = v_org_id
      AND (p.estimate_id = v_estimate_id OR (v_job_id IS NOT NULL AND p.service_job_id = v_job_id))
    ORDER BY p.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: get_public_signed_media_url(p_token text, p_media_id uuid, p_expires_in integer)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_signed_media_url(text, uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_signed_media_url(text, uuid);
DROP FUNCTION IF EXISTS public.get_public_media_url(text, uuid);
CREATE OR REPLACE FUNCTION public.get_public_signed_media_url(
    p_token text, 
    p_media_id uuid, 
    p_expires_in integer DEFAULT 3600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_token text := trim(p_token);
    v_estimate_id uuid;
    v_job_id uuid;
    v_org_id uuid;
    v_storage_path text;
    v_bucket text := 'images';
    v_clean_path text;
    v_jwt_secret text;
    v_exp bigint;
    v_payload text;
    v_header text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    v_signature text;
    v_token text;
BEGIN
    IF v_clean_token IS NULL OR v_clean_token = '' OR p_media_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT est.id, est.organization_id INTO v_estimate_id, v_org_id
    FROM public.estimates est
    WHERE (est.access_token = v_clean_token OR (COALESCE(est.public_token, '') = v_clean_token AND v_clean_token <> ''))
      AND (est.access_token_revoked IS NOT TRUE)
    LIMIT 1;

    IF v_estimate_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT j.id INTO v_job_id
    FROM public.service_jobs j
    WHERE (j.estimate_id = v_estimate_id)
      AND j.organization_id = v_org_id
    LIMIT 1;

    SELECT m.storage_path INTO v_storage_path
    FROM public.service_job_media m
    WHERE m.id = p_media_id
      AND m.organization_id = v_org_id
      AND (m.estimate_id = v_estimate_id OR (v_job_id IS NOT NULL AND m.service_job_id = v_job_id))
      AND m.visible_to_client = true
    LIMIT 1;

    IF v_storage_path IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_storage_path LIKE 'http://%' OR v_storage_path LIKE 'https://%' OR v_storage_path LIKE 'data:%' THEN
        RETURN v_storage_path;
    END IF;

    v_clean_path := v_storage_path;
    IF v_storage_path LIKE 'documents/%' THEN
        v_bucket := 'documents';
        v_clean_path := substring(v_storage_path from 11);
    ELSIF v_storage_path LIKE 'images/%' THEN
        v_bucket := 'images';
        v_clean_path := substring(v_storage_path from 8);
    ELSIF v_storage_path LIKE 'receipts/%' THEN
        v_bucket := 'receipts';
        v_clean_path := substring(v_storage_path from 10);
    END IF;

    v_exp := extract(epoch from (now() + (COALESCE(p_expires_in, 3600) || ' seconds')::interval))::bigint;

    v_jwt_secret := COALESCE(
        current_setting('app.settings.jwt_secret', true),
        current_setting('pgrst.jwt_secret', true),
        'super-secret-jwt-token-with-at-least-32-characters-long'
    );

    v_payload := translate(encode(('{"url":"' || v_bucket || '/' || v_clean_path || '","exp":' || v_exp || '}')::bytea, 'base64'), '+/=', '-_');
    v_payload := regexp_replace(v_payload, '=+$', '');

    v_signature := translate(encode(hmac((v_header || '.' || v_payload)::bytea, v_jwt_secret::bytea, 'sha256'), 'base64'), '+/=', '-_');
    v_signature := regexp_replace(v_signature, '=+$', '');

    v_token := v_header || '.' || v_payload || '.' || v_signature;

    RETURN '/storage/v1/object/sign/' || v_bucket || '/' || v_clean_path || '?token=' || v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_media_url(p_token text, p_media_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    RETURN public.get_public_signed_media_url(p_token, p_media_id, 3600);
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC: get_public_signed_receipt_url(p_token text, p_receipt_id uuid, p_expires_in integer)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_signed_receipt_url(text, uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_signed_receipt_url(text, uuid);
DROP FUNCTION IF EXISTS public.get_public_receipt_url(text, uuid);
CREATE OR REPLACE FUNCTION public.get_public_signed_receipt_url(
    p_token text, 
    p_receipt_id uuid, 
    p_expires_in integer DEFAULT 3600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_token text := trim(p_token);
    v_estimate_id uuid;
    v_job_id uuid;
    v_org_id uuid;
    v_receipt_url text;
    v_bucket text := 'receipts';
    v_clean_path text;
    v_jwt_secret text;
    v_exp bigint;
    v_payload text;
    v_header text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    v_signature text;
    v_token text;
BEGIN
    IF v_clean_token IS NULL OR v_clean_token = '' OR p_receipt_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT est.id, est.organization_id INTO v_estimate_id, v_org_id
    FROM public.estimates est
    WHERE (est.access_token = v_clean_token OR (COALESCE(est.public_token, '') = v_clean_token AND v_clean_token <> ''))
      AND (est.access_token_revoked IS NOT TRUE)
    LIMIT 1;

    IF v_estimate_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT j.id INTO v_job_id
    FROM public.service_jobs j
    WHERE (j.estimate_id = v_estimate_id)
      AND j.organization_id = v_org_id
    LIMIT 1;

    SELECT r.receipt_url INTO v_receipt_url
    FROM public.receipts r
    WHERE r.id = p_receipt_id
      AND r.organization_id = v_org_id
      AND (r.estimate_id = v_estimate_id OR (v_job_id IS NOT NULL AND r.service_job_id = v_job_id))
      AND r.status = 'active'
      AND (r.bill_to_client = true OR r.material_responsibility = 'client' OR r.expense_category = 'client_reimbursable')
      AND (r.material_responsibility IS NULL OR r.material_responsibility != 'company')
    LIMIT 1;

    IF v_receipt_url IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_receipt_url LIKE 'http://%' OR v_receipt_url LIKE 'https://%' OR v_receipt_url LIKE 'data:%' THEN
        RETURN v_receipt_url;
    END IF;

    v_clean_path := v_receipt_url;
    IF v_receipt_url LIKE 'receipts/%' THEN
        v_bucket := 'receipts';
        v_clean_path := substring(v_receipt_url from 10);
    ELSIF v_receipt_url LIKE 'documents/%' THEN
        v_bucket := 'documents';
        v_clean_path := substring(v_receipt_url from 11);
    ELSIF v_receipt_url LIKE 'images/%' THEN
        v_bucket := 'images';
        v_clean_path := substring(v_receipt_url from 8);
    END IF;

    v_exp := extract(epoch from (now() + (COALESCE(p_expires_in, 3600) || ' seconds')::interval))::bigint;

    v_jwt_secret := COALESCE(
        current_setting('app.settings.jwt_secret', true),
        current_setting('pgrst.jwt_secret', true),
        'super-secret-jwt-token-with-at-least-32-characters-long'
    );

    v_payload := translate(encode(('{"url":"' || v_bucket || '/' || v_clean_path || '","exp":' || v_exp || '}')::bytea, 'base64'), '+/=', '-_');
    v_payload := regexp_replace(v_payload, '=+$', '');

    v_signature := translate(encode(hmac((v_header || '.' || v_payload)::bytea, v_jwt_secret::bytea, 'sha256'), 'base64'), '+/=', '-_');
    v_signature := regexp_replace(v_signature, '=+$', '');

    v_token := v_header || '.' || v_payload || '.' || v_signature;

    RETURN '/storage/v1/object/sign/' || v_bucket || '/' || v_clean_path || '?token=' || v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_receipt_url(p_token text, p_receipt_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    RETURN public.get_public_signed_receipt_url(p_token, p_receipt_id, 3600);
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. PERMISSÕES DE EXECUÇÃO PÚBLICA (ANON & AUTHENTICATED)
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_public_estimate_extras(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_client_materials(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_job_media(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_client_payments(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_signed_media_url(text, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_media_url(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_signed_receipt_url(text, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_receipt_url(text, uuid) TO anon, authenticated;
