# Fase 5.3.1 — Correção Final do SQL 006 (Lead Market)

> **Status:** O SQL 006 foi completamente corrigido para utilizar a estrutura real de permissionamento do banco e a simulação via `auth.uid()` nos testes de Rollback.

---

## 1. Tabela Real Confirmada
Após busca profunda pelas *migrations* aplicadas (`000_homeleadpro_schema_draft_v2.sql` e a sequencial delta `v7`), confirmou-se que a tabela existente no Supabase *Carpentry* é **`public.organization_users`**. A tabela `organization_members` não é utilizada neste banco. O script foi adequadamente alterado para utilizar a correta.

## 2. Correções no SQL 006
- As chamadas na RPC para `organization_members` foram alteradas para `organization_users`.
- Foi adicionada a validação de status `and status = 'active'` antes de reconhecer o usuário na organização.
- A função `get_public_available_leads(p_organization_id)` foi alterada para `get_public_available_leads()` (sem parâmetro de entrada), sendo substituída pela captura direta segura do `auth.uid()`.

## 3. Proteção de Tenant em `get_public_available_leads`
A função remove o risco do front-end passar IDs de outras empresas maliciosamente. O parâmetro de `p_organization_id` foi sumariamente removido. A função automaticamente determina a *org* do usuário com base no JWT (`auth.uid()`) internamente na execução. A query `not exists (...)` barra explicitamente da listagem leads que aquela empresa específica já possua no `lead_distributions`.

## 4. Proteção de Worker e Saldo em `buy_public_lead`
A lógica cruza o `auth.uid()` com o atributo `role` e `status` da tabela `organization_users`. Se o usuário em questão for detentor de uma regra 'worker', a função aborta o insert e retorna um erro formal JSON. Quanto ao saldo, ela impede débitos que gerariam negativo verificando a saída imediata da função residente `get_organization_credit_balance()`.

## 5. Simulação de `auth.uid` com ROLLBACK
O script de teste (Opção B) foi atualizado para isolar corretamente os usuários buscando pelo `email` real em `auth.users`. Após a captura do identificador primário (o UUID real da base instalada), o script utiliza uma função nativa da linguagem para injetar o payload JWT simulado da conexão:
`perform set_config('request.jwt.claim.sub', v_owner_a::text, true);`
Dessa forma, toda a rotina interna das RPCs pensa tratar-se de um chamado HTTP autêntico do Owner-A/B ou Worker-A.

---

## 6. Bloco Final Recomendado para Aplicar (006_homeleadpro_buy_lead_rpc.sql)

```sql
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
    where l.source = 'public' and l.status = 'New'
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
```

## 7. Riscos Restantes
A injeção do JWT no modo transacional requer que no ambiente real o próprio token (Session) possua as diretivas de roles (`auth.uid()`) integradas à conexão da RLS de forma sólida. O banco possui segurança em multicamadas, garantindo que usuários que pulem a restrição inicial não possam ler nem subverter outras entidades pela camada REST da API. A estrutura lógica da RPC está madura para testagem com ou sem Front-end via Supabase Dashboard.

---

“A Fase 5.3.1 corrigiu o SQL 006 para usar a tabela real de organização e preparar teste seguro de auth.uid.”
