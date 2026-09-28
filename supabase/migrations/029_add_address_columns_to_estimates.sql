-- Migration 029: Add client_address, client_city, client_state columns to public.estimates
-- Safe, idempotent execution for existing PostgreSQL databases

ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS client_city text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS client_state text;

-- Comment for schema documentation
COMMENT ON COLUMN public.estimates.client_address IS 'Street address for estimate/project site';
COMMENT ON COLUMN public.estimates.client_city IS 'City for estimate/project site';
COMMENT ON COLUMN public.estimates.client_state IS 'State/Province for estimate/project site';
