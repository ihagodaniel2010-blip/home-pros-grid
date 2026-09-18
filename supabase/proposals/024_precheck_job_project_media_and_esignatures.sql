-- =============================================================================
-- PROPOSAL PRECHECK SCRIPT ONLY — READ ONLY (SELECT ONLY)
-- 024_precheck_job_project_media_and_esignatures.sql
-- Introspects existing tables, functions, triggers, and RLS policies for Proposal 024
-- EXECUTABLE ONLY ON PROJECT: ozhjvprhhsdglxokfwze
-- =============================================================================

-- 1. Check existing tables
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
      'organizations', 
      'organization_users', 
      'leads', 
      'estimates', 
      'estimate_items', 
      'service_jobs', 
      'service_extras',
      'electronic_signatures',
      'document_versions',
      'document_signature_events',
      'service_job_media',
      'service_extra_media'
  )
ORDER BY table_name;

-- 2. Check existing columns of estimates, service_extras, service_jobs
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('estimates', 'service_extras', 'service_jobs')
ORDER BY table_name, ordinal_position;

-- 3. Check existing functions (including set_updated_at, get_user_role_in_org, is_worker_assigned_to_job)
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'set_updated_at',
      'update_updated_at_column',
      'get_user_role_in_org',
      'is_super_admin',
      'is_worker_assigned_to_job',
      'generate_public_token',
      'get_client_job_media'
  );

-- 4. Check existing storage buckets
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('signatures', 'job-media', 'signed-documents', 'receipts', 'estimates');

-- 5. Check existing RLS policies on service_extras, service_jobs, estimates
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('estimates', 'service_jobs', 'service_extras');
