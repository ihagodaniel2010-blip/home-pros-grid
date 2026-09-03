-- Post-Application Verification Script for Carpentry Project (ozhjvprhhsdglxokfwze)
-- Run this manually in Supabase SQL Editor AFTER applying 020_h_a_construction_stripe_credit_topup_PRODUCTION_SAFE.sql

SET search_path = public;

-- 1. Confirm function existence
SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'record_stripe_credit_topup';

-- 2. Confirm index existence
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname = 'idx_organization_credit_ledger_ref_type_id';

-- 3. Confirm function permissions (service_role has EXECUTE; anon/authenticated do NOT)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name = 'record_stripe_credit_topup';

-- 4. Confirm no automatic test credits were inserted
SELECT COUNT(*) AS stripe_topup_entries
FROM public.organization_credit_ledger
WHERE reference_type = 'stripe_checkout_session';
