-- 015_homeleadpro_estimate_assistant_drafts.sql
-- HomeLeadPro / Barrigudo
-- Phase 6.4: Smart Estimate Assistant

CREATE TABLE IF NOT EXISTS public.estimate_assistant_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    service_type text NOT NULL,
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    output jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'converted', 'deleted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS estimate_assistant_drafts_org_idx ON public.estimate_assistant_drafts(organization_id);
CREATE INDEX IF NOT EXISTS estimate_assistant_drafts_lead_idx ON public.estimate_assistant_drafts(lead_id);
CREATE INDEX IF NOT EXISTS estimate_assistant_drafts_status_idx ON public.estimate_assistant_drafts(status);

-- RLS
ALTER TABLE public.estimate_assistant_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin has all privileges on estimate assistant drafts" ON public.estimate_assistant_drafts;
DROP POLICY IF EXISTS "Company managers can manage estimate assistant drafts" ON public.estimate_assistant_drafts;

CREATE POLICY "Super admin has all privileges on estimate assistant drafts"
ON public.estimate_assistant_drafts
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "Company managers can manage estimate assistant drafts"
ON public.estimate_assistant_drafts
FOR ALL
USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_estimate_assistant_drafts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_estimate_assistant_drafts_updated_at ON public.estimate_assistant_drafts;

CREATE TRIGGER update_estimate_assistant_drafts_updated_at
    BEFORE UPDATE ON public.estimate_assistant_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_estimate_assistant_drafts();
