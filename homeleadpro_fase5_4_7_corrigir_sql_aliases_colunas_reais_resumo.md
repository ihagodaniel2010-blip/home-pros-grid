# Relatório Fase 5.4.7 — Correção de Aliases SQL e Colunas Reais

## 1. Colunas Reais em `company_service_areas`
O erro reportado no script de diagnóstico revelou uma divergência de mapeamento. As colunas verdadeiras na tabela do Supabase são `zip` e `active`, enquanto o script anterior tentou ler `zip_code` e `is_active`.

## 2. Correção do Diagnóstico (SQL 008)
Substituímos o select fixo incorreto:
```sql
SELECT id, organization_id, zip_code, city, state, is_active FROM public.company_service_areas;
```
Por:
1. Uma listagem dinâmica de colunas extraída de `information_schema.columns` (para mapear 100% o que existe caso tenhamos novas surpresas).
2. O select fixo exato usando os campos confirmados `zip` e `active`.

## 3. Ambiguidades Resolvidas em `get_public_available_leads` (SQL 006)
O erro `column reference "status" is ambiguous` é clássico no Postgres quando não se declara explicitamente a origem do campo, e o escopo da *Stored Procedure* conflita com parâmetros locais ou implicit joins.

Para garantir blindagem à prova de falhas na query:
```sql
select ou.organization_id, ou.role into v_org_id, v_role
from public.organization_users ou
where ou.user_id = v_user_id and ou.status = 'active'
```
Adicionamos o `alias` explícito `ou` em `organization_users` e prefixamos as colunas. O mesmo tratamento blindou as comparações referentes a `l.source`, `l.status` e `ld.organization_id`.

## 4. Teste Rollback Ajustado (SQL 008)
A mesma lógica de blindagem de alias (`ou.status` / `ou.role`) foi aplicada ao teste transacional `.sql` ao simularmos o apontamento da variável local para um *Owner Genérico*.

## 5. Ordem para Rodar no Supabase
O ambiente está isolado, limpo de ambiguidades e pronto para implantação:
1. Execute o **Diagnóstico** (`008_homeleadpro_diagnostico_fluxo_leads.sql`) para mapear visualmente todas as colunas.
2. Execute o **Teste de Rollback** (`008_test_fluxo_public_lead_rollback.sql`) para assegurar que não haja travamentos por colunas inexistentes ou falhas de RLS.
3. Estando perfeitamente funcional o passo (2), execute as migrations RPC **006** e **007** para realizar o COMMIT definitivo no banco de produção.

*(O frontend não sofreu mutações neste ciclo)*

---

“A Fase 5.4.7 corrigiu aliases SQL e colunas reais para validar o fluxo de leads com ROLLBACK.”
