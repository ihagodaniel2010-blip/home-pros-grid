-- ============================================================================
-- MIGRAÇÃO 027 — SISTEMA DE ASSINATURA ELETRÔNICA, ASSINATURA SALVA E PDF REDESIGN
-- PROJETO: Carpentry (H&A Construction LLC)
-- INSTRUÇÕES: Copiar e executar no Supabase SQL Editor
-- EXECUÇÃO AUTOMÁTICA: NÃO (SQL EXECUTED: NO)
-- ============================================================================

BEGIN;

-- 1. Tabela para Assinaturas Salvas do Cliente (DocuSign-like saved signatures)
CREATE TABLE IF NOT EXISTS public.client_saved_signatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    client_email text NOT NULL,
    client_name text NOT NULL,
    client_phone text,
    signature_data_url text NOT NULL,
    signature_type text DEFAULT 'drawn',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índices para busca rápida de assinaturas salvas do cliente
CREATE INDEX IF NOT EXISTS idx_client_saved_signatures_email ON public.client_saved_signatures(organization_id, lower(client_email));

-- 2. Novas Colunas em company_settings para Assinatura do Empreiteiro (Contractor Representative)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS contractor_signature_url text;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS contractor_printed_name text;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS contractor_title text;

-- 3. Novas Colunas em estimates para Armazenar o PDF Imutável e Assinatura Visual
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS signed_pdf_url text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS signed_pdf_hash text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS contractor_signature_url text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS contractor_signed_at timestamptz;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS contractor_name text;

-- 4. Permissões de RLS para client_saved_signatures
ALTER TABLE public.client_saved_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select of saved signatures by email"
    ON public.client_saved_signatures
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert of saved signatures"
    ON public.client_saved_signatures
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update of saved signatures"
    ON public.client_saved_signatures
    FOR UPDATE
    USING (true);

COMMIT;
