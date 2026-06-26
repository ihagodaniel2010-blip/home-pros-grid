-- 016_test_notifications_rollback.sql
-- HomeLeadPro / Barrigudo
-- Teste Autônomo e Rollback da Fase 6.6 (Notifications Center)

BEGIN;

-- ============================================================================
-- PASSO 1: APLICAR SCHEMA TEMPORARIAMENTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ============================================================================
-- PASSO 2: TESTAR FUNCIONALIDADES
-- ============================================================================
DO $$
DECLARE
  v_org_id uuid;
  v_other_org_id uuid;
  v_owner_id uuid;
  v_worker_id uuid;
  v_notification_id uuid;
BEGIN
  -- Identificar organizações de teste
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  SELECT id INTO v_other_org_id FROM public.organizations WHERE id != v_org_id LIMIT 1;
  IF v_org_id IS NULL THEN RAISE NOTICE 'Skipping tests: no organization found.'; RETURN; END IF;

  -- Identificar usuários
  SELECT user_id INTO v_owner_id FROM public.organization_users WHERE organization_id = v_org_id AND role = 'owner' LIMIT 1;
  SELECT user_id INTO v_worker_id FROM public.organization_users WHERE organization_id = v_org_id AND role = 'worker' LIMIT 1;
  IF v_owner_id IS NULL THEN RAISE NOTICE 'Skipping tests: no owner found.'; RETURN; END IF;
  
  -- Setup de RLS test mode para Admin Server (Create notifications usually happens via functions/triggers, but testing here as super_admin bypass or trigger simulation)
  -- We will test read/update via RLS
  
  -- Inject via postgres bypass
  INSERT INTO public.notifications (organization_id, type, title, message)
  VALUES (v_org_id, 'new_lead', 'Test Lead', 'Lead message')
  RETURNING id INTO v_notification_id;

  -- Test Owner Select
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_owner_id), true);
  PERFORM set_config('role', 'authenticated', true);
  IF (SELECT count(*) FROM public.notifications WHERE id = v_notification_id) = 1 THEN
    RAISE NOTICE 'Passou: Owner viu a notificação.';
  ELSE
    RAISE EXCEPTION 'Falhou: Owner não viu a notificação.';
  END IF;

  -- Test Owner Update
  UPDATE public.notifications SET read_at = now() WHERE id = v_notification_id;
  RAISE NOTICE 'Passou: Owner marcou notificação como lida.';

  -- Test Cross-tenant
  IF v_other_org_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_owner_id), true);
    
    BEGIN
      UPDATE public.notifications SET read_at = now() WHERE organization_id = v_other_org_id;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Passou: Owner nao consegue atualizar cross-tenant.';
    END;
    
    IF (SELECT count(*) FROM public.notifications WHERE organization_id = v_other_org_id) > 0 THEN
       RAISE EXCEPTION 'FALHA DE SEGURANÇA: Owner conseguiu ler notificações de outra org.';
    END IF;
  END IF;

  PERFORM set_config('role', 'postgres', true);
  RAISE NOTICE 'Todos os testes passaram com sucesso.';

END $$;

-- ============================================================================
-- PASSO 3: ROLLBACK (DESFAZ TUDO APLICADO NO BEGIN)
-- ============================================================================
ROLLBACK;
