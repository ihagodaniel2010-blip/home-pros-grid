-- Pre-Check Script for Carpentry Project (ozhjvprhhsdglxokfwze)
-- Run this manually in Supabase SQL Editor BEFORE applying 020_h_a_construction_stripe_credit_topup_PRODUCTION_SAFE.sql

SET search_path = public;

-- 1. Check if public.organizations table exists
SELECT table_name, 'organizations table exists' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'organizations';

-- 2. Check if public.organization_credit_ledger table exists and inspect columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'organization_credit_ledger'
ORDER BY ordinal_position;

-- 3. Inspect CHECK constraints on organization_credit_ledger (e.g. transaction_type values)
SELECT conname, pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.organization_credit_ledger'::regclass
AND contype = 'c';

-- 4. Check if function record_stripe_credit_topup already exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'record_stripe_credit_topup';

-- 5. Check if index idx_organization_credit_ledger_ref_type_id already exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname = 'idx_organization_credit_ledger_ref_type_id';
