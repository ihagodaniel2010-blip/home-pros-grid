# Relatório de Auditoria Completa — Fluxo de Leads Públicos (Fases 5.4.3 a 5.4.5)

## 1. Causa Raiz dos Erros Encadeados
- **Erro 1 (`leads_status_check`)**: Aconteceu porque o frontend enviou `status: "new"`, enquanto o banco exigia `status: "New"` em CamelCase de acordo com o `check_constraint` herdado do projeto base.
- **Erro 2 (`violates row-level security policy`)**: Aconteceu porque o frontend anônimo (anon) estava tentando fazer `insert` diretamente na tabela `public.leads`, algo bloqueado pelas políticas (RLS) que blindam a tabela contra escritas anônimas.
- **Erro 3 (`function digest(text, unknown) does not exist`)**: Aconteceu porque, ao usarmos a RPC `submit_public_lead` para contornar o RLS de forma segura, o `insert` interno acionou a trigger automática do banco `trg_leads_assign_token`. Essa trigger chama a função `generate_public_token()`, que utilizava `digest()`. Como a RPC limitou o `search_path = public`, ela impediu o Postgres de enxergar o pacote `pgcrypto` no schema `extensions`, quebrando a trigger e, em cascata, a RPC.

## 2. Solução Definitiva e Correções no SQL 007
A RPC de inserção de lead público (`007_homeleadpro_submit_public_lead_rpc.sql`) foi integralmente revisada:
1. **Omitimos o uso de `digest()`**: Adicionamos o script de sobrescrita (replace) para a função `generate_public_token()`, que agora usa apenas a concatenação segura `concat('lead_', replace(gen_random_uuid()::text, '-', ''))`.
2. **Atualização do Search Path**: Corrigimos a RPC para utilizar `set search_path = public, extensions`, garantindo total visibilidade de plugins base caso outras triggers preexistentes necessitem deles.

## 3. Schema e RLS da Tabela Leads
- **Schema/Colunas**: A tabela comprovadamente utiliza nomenclaturas CamelCase (`createdAt`, `serviceSlug`, etc.), o que já alinhamos no fluxo da RPC e do frontend.
- **RLS Atual**: O RLS de `leads` segue intacto (bloqueando insert anônimo). A RPC `submit_public_lead` (via `SECURITY DEFINER`) atua como a única ponte segura de inserção.
- **Lead Market / Leads Órfãos**: Os leads públicos entram sem `organization_id` e com `source = 'public'`. Isso os qualifica perfeitamente para serem capturados pelo `get_public_available_leads` da Fase 5.3.

## 4. Frontend e Assinaturas
O frontend (`src/lib/leads.ts`) não tem mais NENHUM vestígio de `supabase.from("leads").insert`. Todas as propriedades de segurança do payload agora invocam estritamente a RPC, repassando os parâmetros com prefixo `p_`. 

## 5. Scripts Criados para Aplicação Segura
- `008_homeleadpro_diagnostico_fluxo_leads.sql`: Utilizado para extrair métricas e definições vitais da tabela sem alterar NADA.
- `008_test_fluxo_public_lead_rollback.sql`: Um script de estresse **ponta a ponta**. Ele insere o lead anônimo com a nova estrutura e simula um Owner visualizando-o e comprando-o pelo fluxo do Lead Market, revertendo (ROLLBACK) absolutamente tudo no final.

## 6. Ordem Segura de Aplicação (Próximo Passo)
1. Aplicar os scripts **006** (Lead Market RPC) e **007** (Submit Public Lead RPC) no SQL Editor do Supabase utilizando o botão **Run** padrão (que faz o COMMIT implícito).
2. Opcionalmente, rodar o `008_test_fluxo_public_lead_rollback.sql` para checar comportamento.
3. Testar manualmente o envio em `localhost:8080/quote/plumbing` ou `drywall`.

---

“A auditoria completa alinhou schema, RLS, RPCs e frontend do fluxo de leads antes de novos testes.”
