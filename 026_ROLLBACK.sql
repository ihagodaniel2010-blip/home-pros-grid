-- ============================================================================
-- SCRIPT DE ROLLBACK MIGRAÇÃO 026 (RESTAURAÇÃO DO ESTADO ANTERIOR)
-- PROJETO: Carpentry (H&A Construction)
-- DATA: 2026-09-26
-- INSTRUÇÕES: Executar no Supabase SQL Editor se desejar desfazer a Migração 026
-- ============================================================================

-- 1. REVOGAR PERMISSÕES PÚBLICAS CONCEDIDAS NA MIGRAÇÃO 026
REVOKE EXECUTE ON FUNCTION public.get_public_estimate_extras(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_client_materials(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_job_media(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_client_payments(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_signed_media_url(text, uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_media_url(text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_signed_receipt_url(text, uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_receipt_url(text, uuid) FROM anon, authenticated;

-- 2. ELIMINAR EXCLUSIVAMENTE AS RPCs INTRODUZIDAS PELA MIGRAÇÃO 026
DROP FUNCTION IF EXISTS public.get_public_estimate_extras(text);
DROP FUNCTION IF EXISTS public.get_public_client_materials(text);
DROP FUNCTION IF EXISTS public.get_public_job_media(text);
DROP FUNCTION IF EXISTS public.get_public_client_payments(text);
DROP FUNCTION IF EXISTS public.get_public_signed_media_url(text, uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_signed_media_url(text, uuid);
DROP FUNCTION IF EXISTS public.get_public_media_url(text, uuid);
DROP FUNCTION IF EXISTS public.get_public_signed_receipt_url(text, uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_signed_receipt_url(text, uuid);
DROP FUNCTION IF EXISTS public.get_public_receipt_url(text, uuid);
