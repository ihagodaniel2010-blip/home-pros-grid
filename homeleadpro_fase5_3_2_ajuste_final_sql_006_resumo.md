# Fase 5.3.2 — Ajuste Final do SQL 006 e Frontend

> **Status:** O SQL 006 foi finalizado com as devidas concessões (*grants*) e ajustes de filtro. O Frontend foi corrigido para se conectar à nova versão sem argumentos. A compilação está finalizada.

---

## 1. Ajuste no Frontend
O helper local (`src/lib/lead-market.ts`) foi atualizado. Originalmente, ele utilizava uma consulta direta via `supabase.from('leads').select()`. Essa consulta foi integralmente substituída para chamar a nova infraestrutura RPC sem exigir parâmetros inseguros do cliente. A chamada agora usa explicitamente:
`const { data, error } = await supabase.rpc('get_public_available_leads');`

Adicionalmente, corrigimos também a função do lado do cliente `getOrganizationBalance` que estava consultando a tabela errônea `organization_members`. Ela agora espelha a arquitetura real apontando para a `organization_users`.

## 2. Ajuste do Filtro de Status
O SQL na listagem pública da RPC `get_public_available_leads` foi melhorado. Para abranger de modo resiliente qualquer variação temporal no banco sobre a inserção de status de Leads, a condição restrita `l.status = 'New'` foi refatorada globalmente para:
`lower(l.status) = 'new'`
Isso previne interrupções caso novas origens preencham como 'new', 'New', ou 'NEW'.

## 3. Grants Inseridos
O Supabase, por utilizar um rigoroso controle de papéis (*PostgREST*), obriga que novas rotinas não-nativas tenham privilégios garantidos explicitamente para quem as consome através do endpoint da API. As seguintes diretrizes foram adicionadas ao fim do arquivo `006`:
```sql
grant execute on function public.get_public_available_leads() to authenticated;
grant execute on function public.buy_public_lead(uuid) to authenticated;
```

## 4. Resultado do Build (`npm run build`)
O processo de build confirmou a higienização do arquivo `src/lib/lead-market.ts` (sem variáveis órfãs). Ele compilou com extremo sucesso e sem erros nas conferências do TypeScript (`Compiled successfully`). O projeto se encontra hígido.

## 5. SQL Final Pronto para Teste e Aplicação (006_homeleadpro_buy_lead_rpc.sql)

```sql
-- Proposta para Fase 5.3.1 - Lead Market (Comprar/Receber Lead) Corrigida
-- Este arquivo NÃO DEVE ser aplicado automaticamente. Aguardar revisão e aprovação.

-- 1. Função para listar leads públicos disponíveis para a empresa
create or replace function public.get_public_available_leads()
returns table (
    id uuid,
    status text,
    created_at timestamptz,
    city text,
    state text,
    zip_code text,
    urgency text,
    details text,
    is_public boolean,
    service_slug text,
    base_price numeric
)
language plpgsql security definer set search_path = public
as $$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_role text;
begin
    v_user_id := auth.uid();
    if v_user_id is null then return; end if;

    select organization_id, role into v_org_id, v_role
    from public.organization_users
    where user_id = v_user_id and status = 'active'
    limit 1;

    if v_org_id is null or v_role not in ('owner', 'admin', 'super_admin') then return; end if;

    return query
    select 
        l.id, l.status, l."createdAt" as created_at,
        ''::text as city, ''::text as state, l.zip as zip_code, l.urgency,
        coalesce(l."ownerNotes", l."selectedServiceOption", '') as details,
        (l.source = 'public') as is_public, l."serviceSlug" as service_slug,
        coalesce(
            (select pr.base_price from public.lead_pricing_rules pr where pr.service_category_id = l.service_category_id and pr.active = true order by pr.created_at desc limit 1), 
            30.00 
        ) as base_price
    from public.leads l
    where l.source = 'public' and lower(l.status) = 'new'
      and not exists (select 1 from public.lead_distributions ld where ld.lead_id = l.id and ld.organization_id = v_org_id)
    order by l."createdAt" desc;
end;
$$;

-- 2. Função para comprar um lead público
create or replace function public.buy_public_lead(p_lead_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
    v_user_id uuid;
    v_organization_id uuid;
    v_role text;
    v_lead_source text;
    v_service_category_id uuid;
    v_base_price numeric;
    v_current_balance numeric;
    v_already_bought boolean;
begin
    v_user_id := auth.uid();
    if v_user_id is null then return jsonb_build_object('success', false, 'message', 'Unauthorized. User not logged in.'); end if;

    select organization_id, role into v_organization_id, v_role 
    from public.organization_users 
    where user_id = v_user_id and status = 'active'
    limit 1;
    
    if v_organization_id is null then return jsonb_build_object('success', false, 'message', 'User does not belong to an active organization.'); end if;
    if v_role not in ('owner', 'admin', 'super_admin') then return jsonb_build_object('success', false, 'message', 'Only owners or admins can buy leads.'); end if;

    select source, service_category_id into v_lead_source, v_service_category_id from public.leads where id = p_lead_id;
    if v_lead_source is null or v_lead_source != 'public' then return jsonb_build_object('success', false, 'message', 'Lead not found or not public.'); end if;

    select exists (select 1 from public.lead_distributions where lead_id = p_lead_id and organization_id = v_organization_id) into v_already_bought;
    if v_already_bought then return jsonb_build_object('success', false, 'message', 'Your organization has already purchased this lead.'); end if;

    select base_price into v_base_price from public.lead_pricing_rules where service_category_id = v_service_category_id and active = true order by created_at desc limit 1;
    if v_base_price is null then v_base_price := 30.00; end if;

    v_current_balance := public.get_organization_credit_balance(v_organization_id);
    if v_current_balance < v_base_price then return jsonb_build_object('success', false, 'message', 'Insufficient credit balance.', 'required', v_base_price, 'balance', v_current_balance); end if;

    insert into public.lead_distributions (lead_id, organization_id, price_charged, status, charged_at, distributed_at) 
    values (p_lead_id, v_organization_id, v_base_price, 'distributed', now(), now());

    insert into public.organization_credit_ledger (organization_id, amount, transaction_type, reference_type, reference_id, balance_after, description) 
    values (v_organization_id, -v_base_price, 'lead_debit', 'lead_distribution', p_lead_id, v_current_balance - v_base_price, 'Purchased lead ' || p_lead_id);

    return jsonb_build_object('success', true, 'message', 'Lead purchased successfully.', 'price_charged', v_base_price, 'new_balance', v_current_balance - v_base_price);
exception when others then return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

-- 3. Grants
grant execute on function public.get_public_available_leads() to authenticated;
grant execute on function public.buy_public_lead(uuid) to authenticated;
```

---

“A Fase 5.3.2 deixou o SQL 006 e o frontend prontos para teste ROLLBACK e posterior COMMIT manual.”
