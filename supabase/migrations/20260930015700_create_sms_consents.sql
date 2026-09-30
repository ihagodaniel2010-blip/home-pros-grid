/* Migration: Create sms_consents table */

CREATE TABLE public.sms_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  phone_e164 text NOT NULL,
  status text NOT NULL CHECK (status IN ('confirmed','declined','revoked')),
  method text NOT NULL CHECK (method IN ('web','verbal_phone','verbal_in_person','inbound_sms')),
  event_at timestamptz NOT NULL DEFAULT now(),
  recorded_by_user_id uuid REFERENCES auth.users(id),
  actor_type text NOT NULL CHECK (actor_type IN ('staff','customer','system')),
  consent_text_version text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX sms_consents_org_phone_idx ON public.sms_consents (organization_id, phone_e164, event_at DESC);
CREATE INDEX sms_consents_status_idx ON public.sms_consents (status);
CREATE INDEX sms_consents_method_idx ON public.sms_consents (method);
CREATE INDEX sms_consents_lead_idx ON public.sms_consents (lead_id);
CREATE INDEX sms_consents_estimate_idx ON public.sms_consents (estimate_id);

-- Integrity constraints
ALTER TABLE public.sms_consents ADD CONSTRAINT verbal_staff_chk CHECK (
  (method IN ('verbal_phone','verbal_in_person') AND actor_type = 'staff' AND recorded_by_user_id IS NOT NULL)
  OR method NOT IN ('verbal_phone','verbal_in_person')
);

ALTER TABLE public.sms_consents ADD CONSTRAINT inbound_customer_chk CHECK (
  (method = 'inbound_sms' AND actor_type = 'customer' AND recorded_by_user_id IS NULL)
  OR method <> 'inbound_sms'
);

-- Enable Row Level Security
ALTER TABLE public.sms_consents ENABLE ROW LEVEL SECURITY;

-- Policies: deny direct access for anon and authenticated users
CREATE POLICY deny_anon ON public.sms_consents FOR ALL TO anon USING (false);
CREATE POLICY deny_auth ON public.sms_consents FOR ALL TO authenticated USING (false);
