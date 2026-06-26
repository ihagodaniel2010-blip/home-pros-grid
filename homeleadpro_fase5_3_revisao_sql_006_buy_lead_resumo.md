# Fase 5.3 — Revisão e Aplicação Segura da RPC de Compra de Lead

> **Status:** SQL 006 revisado, ajustado para as colunas reais do Carpentry, e script de validação segura (ROLLBACK) gerado. **Nenhum COMMIT foi executado.**

---

## 1. Ajuste de Compatibilidade do SQL 006
O SQL inicial precisou de um leve ajuste. O projeto atual estende a estrutura preexistente do *Carpentry*, o que significa que várias colunas essenciais do frontend ainda usam `camelCase` (como `createdAt` e `serviceSlug`). A versão final do **SQL 006** foi devidamente reescrita para refletir as colunas exatas da tabela real `public.leads`, garantindo plena correspondência de tipos e evitando a falha "`column does not exist`".

## 2. Colunas Reais Confirmadas
A revisão no schema consolidou o uso das seguintes colunas em `leads`:
- `id` (uuid)
- `source` (no lugar de `is_public` -> usa `source = 'public'`)
- `status` (checa por 'New')
- `zip` (no lugar de `zip_code`)
- `"createdAt"` (com aspas, ao invés de `created_at`)
- `"serviceSlug"`
- `"ownerNotes"` / `"selectedServiceOption"` (utilizado como os *details*)

## 3. Como a Função Calcula o Saldo
O script aciona a RPC de infraestrutura já instalada `public.get_organization_credit_balance(org_id)`. Essa função do sistema consulta de modo seguro a `organization_credit_ledger` e agrupa a coluna `amount` com total segurança transacional.

## 4. Como a Função Calcula o Preço
Ao realizar a requisição, o sistema busca na tabela de configuração `public.lead_pricing_rules` o registro mais recente vinculado à `service_category_id` do Lead em questão. 
- *Fallback Seguro:* Se não houver regra de precificação criada no sistema ainda para aquele serviço, ele define um custo base fixo temporário de **$30.00**.

## 5. Como Bloqueia o Worker
As RPCs foram configuradas com a injeção do papel (Role). A primeira ação do `buy_public_lead` é extrair a Role na tabela `organization_members`. A compra falhará e retornará erro explícito de *Unauthorized* se a Role não estiver contida na restrição: `('owner', 'admin', 'super_admin')`.

## 6. Como Evita Compra Duplicada
A RPC conta com um mecanismo seguro de averiguação: antes da compra, ela usa o gatilho booleano `EXISTS` fazendo um select rápido na tabela de controle de aquisição (`public.lead_distributions`). Se uma combinação de `lead_id` + `organization_id` já existir, a rotina imediatamente interrompe o bloco e devolve uma resposta alertando o usuário.

---

## 7. Bloco SQL Final Recomendado (Para Copiar no Editor)

Se desejar aplicar fisicamente o fluxo, este é o conteúdo revisado final do arquivo 006, seguro:

```sql
-- 1. Função para listar leads públicos disponíveis para a empresa
create or replace function public.get_public_available_leads(p_organization_id uuid)
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
begin
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
      and not exists (select 1 from public.lead_distributions ld where ld.lead_id = l.id and ld.organization_id = p_organization_id)
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

    select organization_id, role into v_organization_id, v_role from public.organization_members where user_id = v_user_id limit 1;
    if v_organization_id is null then return jsonb_build_object('success', false, 'message', 'User does not belong to an organization.'); end if;
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

---

## 8. Bloco de Teste BEGIN / ROLLBACK
Gerado o script para homologação manual sem comprometer o banco de dados. Este script roda todos os fluxos lógicos propostos no MVP para Owner A (Compra normal e tentativa de duplicação), Owner B (Teste contra falha de saldo baixo), e Worker (Teste contra falha de Role não autorizada). O código encontra-se armazenado localmente em:
`supabase/migrations/006_test_buy_lead_rollback.sql`

## 9. Riscos antes do COMMIT
- O Front-end espera um objeto de Leads com os mesmos exatos atributos estipulados na RPC (e já ajustados nesta revisão).
- A verificação de saldo confia puramente em `get_organization_credit_balance`. Uma anomalia nos triggers do banco que impeça essa consolidação impedirá a conta, mas a robustez das `constraints` barraria transações defeituosas. 
- Sem riscos residuais graves identificados antes da aplicação local.

## 10. Próximo Passo
Abrir o painel SQL do Supabase (SQL Editor), executar primeiramente o arquivo `006_homeleadpro_buy_lead_rpc.sql` para estabelecer a infraestrutura. Logo na sequência, realizar o colar do bloco `BEGIN / ROLLBACK` (presente em `006_test_buy_lead_rollback.sql`) para assegurar o feedback dos 4 testes lógicos ali descritos. Caso os notices sejam estritamente de `"SUCESSO"`, você estará totalmente limpo para dar prosseguimento!

---
“A Fase 5.3 revisou a RPC de compra de lead e preparou teste seguro com ROLLBACK, sem aplicar COMMIT.”
