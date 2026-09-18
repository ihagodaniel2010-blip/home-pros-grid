-- =============================================================================
-- PROPOSAL PRECHECK SCRIPT ONLY — READ ONLY (SELECT) — DO NOT EXECUTE AUTOMATICALLY
-- 024_precheck_job_project_media_and_esignatures.sql
-- Introspects existing tables, functions, triggers, and RLS policies for Proposal 024
-- =============================================================================

-- 1. Check existing tables
select table_schema, table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_name in (
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
order by table_name;

-- 2. Check existing columns of estimates and service_extras
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('estimates', 'service_extras', 'service_jobs')
order by table_name, ordinal_position;

-- 3. Check existing functions
select routine_name, routine_type, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
      'get_user_role_in_org',
      'is_super_admin',
      'is_worker_assigned_to_job',
      'generate_public_token',
      'trg_fn_assign_tokens'
  );

-- 4. Check existing storage buckets
select id, name, public
from storage.buckets
where id in ('signatures', 'job-media', 'signed-documents', 'receipts');

-- 5. Check existing RLS policies on service_extras & service_jobs
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('estimates', 'service_jobs', 'service_extras');
