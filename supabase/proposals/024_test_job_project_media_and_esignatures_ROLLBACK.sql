-- =============================================================================
-- PROPOSAL ROLLBACK SCRIPT — DO NOT EXECUTE AUTOMATICALLY
-- 024_test_job_project_media_and_esignatures_ROLLBACK.sql
-- Rollback script for proposal 024
-- =============================================================================

drop policy if exists "Public portfolio can read approved media" on public.service_job_media;
drop policy if exists "Clients can view client-visible job media" on public.service_job_media;
drop policy if exists "Company managers can manage job media" on public.service_job_media;
drop policy if exists "Company managers can view electronic signatures" on public.electronic_signatures;

drop table if exists public.service_job_media cascade;
drop table if exists public.service_extra_media cascade;
drop table if exists public.electronic_signatures cascade;

-- delete from storage.buckets where id in ('signatures', 'job-media');
