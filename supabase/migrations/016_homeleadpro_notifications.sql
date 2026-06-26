-- 016_homeleadpro_notifications.sql
-- HomeLeadPro / Barrigudo
-- Phase 6.6: Notifications Center

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- if null, org-wide
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    entity_type text,
    entity_id uuid,
    severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'error')),
    read_at timestamptz,
    dismissed_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_org_idx ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS notifications_dismissed_idx ON public.notifications(dismissed_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin has all privileges on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Company members can view their org notifications" ON public.notifications;
DROP POLICY IF EXISTS "Company members can update their org notifications" ON public.notifications;

CREATE POLICY "Super admin has all privileges on notifications"
ON public.notifications
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "Company members can view their org notifications"
ON public.notifications
FOR SELECT
USING (
  public.get_user_role_in_org(organization_id) IN ('owner', 'admin', 'worker')
  AND
  (user_id IS NULL OR user_id = auth.uid())
);

CREATE POLICY "Company members can update their org notifications"
ON public.notifications
FOR UPDATE
USING (
  public.get_user_role_in_org(organization_id) IN ('owner', 'admin', 'worker')
  AND
  (user_id IS NULL OR user_id = auth.uid())
)
WITH CHECK (
  public.get_user_role_in_org(organization_id) IN ('owner', 'admin', 'worker')
  AND
  (user_id IS NULL OR user_id = auth.uid())
);
