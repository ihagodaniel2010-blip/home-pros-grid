-- ==============================================================================
-- 024_REVERT_job_project_media_and_esignatures.sql
--
-- OPERATIONAL REVERT SCRIPT (FOR FUTURE MANUAL DEPLOYMENT IF 024 WAS EVER APPLIED)
-- DO NOT EXECUTE AUTOMATICALLY. DO NOT USE CASCADE BLINDLY ON PRODUCTION DATA.
-- STATUS: PROPOSAL FOR MANUAL REVIEW ONLY — DO NOT EXECUTE
-- ==============================================================================

-- 1. Drop Storage Policies (If created)
DROP POLICY IF EXISTS "Allow job-media access by organization members" ON storage.objects;
DROP POLICY IF EXISTS "Allow signatures access by organization members" ON storage.objects;
DROP POLICY IF EXISTS "Allow signed-documents access by organization members" ON storage.objects;

-- 2. Drop RPC Functions
DROP FUNCTION IF EXISTS public.get_client_job_media(UUID);

-- 3. Drop Triggers & Function
DROP TRIGGER IF EXISTS trigger_update_service_job_media_updated_at ON public.service_job_media;
DROP FUNCTION IF EXISTS public.update_service_job_media_updated_at();

-- 4. Drop Tables in reverse dependency order (Explicitly without CASCADE to protect integrity)
-- Drop tables only if they were added by 024
DROP TABLE IF EXISTS public.document_signature_events;
DROP TABLE IF EXISTS public.electronic_signatures;
DROP TABLE IF EXISTS public.document_versions;
DROP TABLE IF EXISTS public.service_extra_media;
DROP TABLE IF EXISTS public.service_job_media;
