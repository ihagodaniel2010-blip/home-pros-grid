-- ============================================================================
-- SCRIPT DE ROLLBACK MIGRAÇÃO 026 (RESTAURAÇÃO DO ESTADO ANTERIOR)
-- PROJETO: Carpentry (H&A Construction)
-- DATA: 2026-09-26
-- INSTRUÇÕES: Executar no Supabase SQL Editor se desejar desfazer a Migração 026
-- ============================================================================

BEGIN;

-- 1. REVOGAR PERMISSÕES PÚBLICAS CONCEDIDAS NA MIGRAÇÃO 026
REVOKE EXECUTE ON FUNCTION public.get_public_estimate_extras(text) FROM anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_public_client_materials(text) FROM anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_public_job_media(text) FROM anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_public_client_payments(text) FROM anon, authenticated, service_role;

-- 2. ELIMINAR EXCLUSIVAMENTE AS QUATRO RPCs DA VERSÃO ATUAL DA MIGRAÇÃO 026
DROP FUNCTION IF EXISTS public.get_public_estimate_extras(text);
DROP FUNCTION IF EXISTS public.get_public_client_materials(text);
DROP FUNCTION IF EXISTS public.get_public_job_media(text);
DROP FUNCTION IF EXISTS public.get_public_client_payments(text);

COMMIT;
