-- ============================================================================
-- PROPOSTA DE MIGRAÇÃO 026 (FINAL CONSOLIDADA E AUDITADA)
-- TÍTULO: PUBLIC CLIENT PORTAL RPCs FOR SECURE READ ACCESS
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
-- 5. PERMISSÕES DE EXECUÇÃO PÚBLICA (ANON & AUTHENTICATED)
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_public_estimate_extras(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_client_materials(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_job_media(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_client_payments(text) TO anon, authenticated;
