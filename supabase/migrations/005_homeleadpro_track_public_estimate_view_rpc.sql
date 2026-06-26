-- 005_homeleadpro_track_public_estimate_view_rpc.sql
--
-- PROPOSTA DE MIGRAÇÃO — NÃO APLICAR SEM APROVAÇÃO
--
-- Esta migração adiciona a RPC pública track_public_estimate_view
-- para rastrear quando um cliente visualiza um orçamento pelo link público,
-- sem depender de autenticação ou atualização direta na tabela estimates.
--
-- OBJETIVO:
-- 1. Permitir que o sistema registre visualizações de orçamentos anônimos.
-- 2. Atualizar o status do estimate de 'sent' para 'viewed' de forma segura.
-- 3. Registrar o IP (opcional, se disponível no header) e timestamp.
--
-- PRÉ-REQUISITOS:
-- - A tabela public.estimates já deve existir com coluna public_token text ou uuid.
-- - A coluna status já deve aceitar o valor 'viewed' ou 'Viewed'.
-- - Esta função usa SECURITY DEFINER para bypassa o RLS do anônimo.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Revise com um BEGIN; ... ROLLBACK; no SQL Editor do Supabase primeiro.
-- 2. Se estiver OK, execute com BEGIN; ... COMMIT;

--------------------------------------------------------------------------------
-- RPC: track_public_estimate_view
--------------------------------------------------------------------------------

create or replace function public.track_public_estimate_view(p_token text)
returns void
security definer
language plpgsql
as $$
declare
  v_estimate_id uuid;
  v_current_status text;
begin
  -- Buscar o estimate pelo token público
  select id, status
  into v_estimate_id, v_current_status
  from public.estimates
  where public_token = p_token
  limit 1;

  if v_estimate_id is null then
    raise exception 'Estimate not found for token: %', p_token;
  end if;

  -- Apenas atualizar se ainda estiver em status 'sent'/'Sent'
  -- (não sobrescrever 'approved', 'rejected', 'paid' etc.)
  if lower(v_current_status) = 'sent' then
    update public.estimates
    set
      status = 'Viewed',
      updated_at = now()
    where id = v_estimate_id;
  end if;

  -- Opcional: Inserir registro de auditoria em estimate_view_logs (tabela futura)
  -- insert into public.estimate_view_logs (estimate_id, viewed_at)
  -- values (v_estimate_id, now());

end;
$$;

-- Grant de execução para usuários anônimos
grant execute on function public.track_public_estimate_view(text) to anon;
grant execute on function public.track_public_estimate_view(text) to authenticated;

comment on function public.track_public_estimate_view(text) is
  'Rastreia visualização pública de orçamento pelo token. Atualiza status de Sent para Viewed.';

--------------------------------------------------------------------------------
-- COMENTÁRIO DE USO NO FRONTEND:
--
-- No arquivo src/pages-spa/PublicView.tsx, localizar o TODO e adicionar:
--
--   if (data.status === 'Sent') {
--     await supabase.rpc('track_public_estimate_view', { p_token: tk });
--   }
--
-- Isso substitui o update direto que foi comentado na Fase 4.
--------------------------------------------------------------------------------
