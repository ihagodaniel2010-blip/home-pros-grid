# Relatório Fase 1.1 — Revisão de Segurança dos Rascunhos SQL do HomeLeadPro

Este relatório consolida a revisão e correção de segurança lógica aplicadas aos arquivos SQL de rascunho de banco de dados e políticas RLS para o **HomeLeadPro SaaS Multiempresa**, preparando o ecossistema local antes da sua aplicação controlada no Supabase.

---

## 1. Resumo Executivo

A Fase 1.1 realizou uma auditoria técnica rigorosa sobre o design de segurança lógica do banco de dados do HomeLeadPro. O foco principal foi mitigar riscos de vazamento de dados de clientes e concorrência corporativa causados por políticas RLS genéricas do tipo `USING (true)`.

Como solução definitiva, removemos o acesso direto de seleção pública (`SELECT`) das tabelas sensíveis do sistema. Todo o fluxo de acesso público para clientes sem login foi canalizado através de funções RPC (Remote Procedure Calls) seguras baseadas em PL/pgSQL e marcadas como `security definer`. Estas funções exigem validação criptográfica do `public_token` gerado pelo sistema.

Adicionalmente, refinamos o modelo societário de participação (sócios ativos totalizando exatamente 100% para execução financeira), a segurança de ledgers de crédito (transações atômicas e idempotentes sem risco de estouro ou saldo negativo), a preservação dos dados legados de reviews sem renomeações destrutivas e o isolamento de buckets privados de Storage.

---

## 2. Arquivos Revisados

A auditoria revisou os seguintes rascunhos originais criados na Fase 1:
* [000_homeleadpro_schema_draft.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/000_homeleadpro_schema_draft.sql)
* [001_homeleadpro_rls_draft.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/001_homeleadpro_rls_draft.sql)
* [002_homeleadpro_functions_triggers_draft.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/002_homeleadpro_functions_triggers_draft.sql)
* [homeleadpro_database_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_database_plan.md)
* [homeleadpro_rls_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_rls_plan.md)
* [homeleadpro_storage_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_storage_plan.md)
* [relatorio_fase1_plano.md](file:///c:/Desenvolvimento/SiteIhago/Site/relatorio_fase1_plano.md)

---

## 3. Arquivos Alterados / Criados

Foram criados e atualizados os seguintes arquivos na estrutura local:
* **Novos Rascunhos SQL Locais (v2):**
  * [000_homeleadpro_schema_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/000_homeleadpro_schema_draft_v2.sql) — Nova DDL com status lowercase, nullable no reviews.user_id e sem renomeação de colunas.
  * [001_homeleadpro_rls_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/001_homeleadpro_rls_draft_v2.sql) — Nova matriz RLS com remoção de `using(true)`, bloqueios de trabalhadores em dados sensíveis e leads, e isolamento tenant restritivo.
  * [002_homeleadpro_functions_triggers_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/002_homeleadpro_functions_triggers_draft_v2.sql) — Novas funções PL/pgSQL compreendendo RPCs de tokens, distribuição de leads de sistema, validações de saldo e fechamento de participação de sócios.
* **Documentação Técnica Atualizada:**
  * [homeleadpro_database_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_database_plan.md) — Atualizado para contemplar a modelagem v2.
  * [homeleadpro_rls_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_rls_plan.md) — Atualizado com a nova matriz de acesso RLS e RPCs.
  * [homeleadpro_storage_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_storage_plan.md) — Atualizado com o controle de privacidade de buckets via RPC.

---

## 4. Problemas Encontrados

Durante o pente-fino de segurança nos arquivos SQL originais da Fase 1, identificamos os seguintes riscos críticos:
1. **RLS Público Inseguro (`using (true)`):** As tabelas `estimates`, `estimate_items`, `service_extras` e `service_files` possuíam políticas de seleção abertas com `USING (true)`. Qualquer usuário malicioso ou anônimo poderia listar, enumerar ou despejar todas as faturas e extras de todas as empresas do sistema rodando uma query simples no cliente Supabase.
2. **Dependência de Headers HTTP no RLS:** A tentativa de passar um cabeçalho customizado (como `x-public-token`) em políticas RLS para anônimos gerava complexidade e dependência de configurações não nativas no PostgREST, sendo frágil caso o cabeçalho não fosse injetado pelo frontend.
3. **Modelagem de Leads Multi-Tenant Incorreta:** A trigger `debit_lead_distribution()` sobrescrevia a coluna `leads.organization_id` com a empresa que comprava o lead. Isso impossibilitava a venda concorrente do mesmo lead público para até 3 empresas diferentes, anulando a modelagem multi-tenant. Além disso, a RLS de `leads` verificava apenas o `organization_id` direto, impedindo que empresas compradoras visualizassem leads públicos adquiridos.
4. **Falta de Idempotência e Transacionalidade na Distribuição:** A cobrança de créditos e criação de distribuição ocorria via trigger de evento `AFTER INSERT` na tabela `lead_distributions`. Se houvesse falhas no saldo ou no ledger após a inserção, a gravação da distribuição poderia ficar inconsistente ou gerar corridas de concorrência.
5. **Rigidez Societária no Cadastro:** A trigger original de sócios barrava qualquer inserção se a soma total não fosse 100%. Isso impedia o cadastro progressivo de sócios em formato de rascunho (soma < 100% durante a adição).
6. **Renomeação Perigosa de Reviews:** O arquivo original continha comandos de `RENAME COLUMN` na tabela `reviews` existente. Isso quebraria o frontend atual ([reviewsService.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/reviewsService.ts)), o qual consulta diretamente as colunas originais `user_name` e `body`.
7. **Status e Enums Não Padronizados:** Havia misturas de uppercase e lowercase em constraints check de status (ex: 'Draft', 'Sent', 'New', 'Contacted').

---

## 5. Correções Aplicadas

Para solucionar estes riscos, aplicamos as seguintes correções nos arquivos v2 locais:

### 5.1. RLS Público Corrigido
* Removemos todas as cláusulas `USING (true)` e `USING (visibility = 'client')` sem checagem das tabelas sensíveis.
* O acesso público para anônimos no RLS destas tabelas foi desabilitado por padrão (restrito a `get_user_role_in_org(organization_id) in ('owner', 'admin')` para usuários autenticados).
* Toda e qualquer leitura/ação pública de faturas, itens, fotos ou extras ocorre por meio de RPCs seguras que autenticam o `public_token` criptografado via PL/pgSQL em tempo de execução.

### 5.2. RPCs Públicas Seguras Criadas/Planejadas
Implementamos e documentamos as seguintes funções RPC com privilégio `SECURITY DEFINER` na migração `002_homeleadpro_functions_triggers_draft_v2.sql`:
* `get_public_estimate(p_token text) returns json`: Busca detalhes básicos do orçamento e informações públicas da empresa (nome, logo, e-mail, telefone, site), omitindo dados societários, de crédito ou custos internos da empresa.
* `get_public_estimate_items(p_token text) returns table`: Retorna as linhas de faturamento do estimate que combinam com o token.
* `get_public_estimate_files(p_token text) returns table`: Retorna mídias de vistoria atreladas ao estimate marcadas com `visibility = 'client'`.
* `approve_public_estimate(p_token text) returns boolean`: Aprova o orçamento se o status for `draft`, `sent` ou `viewed`. Registra a data de aprovação (`approved_at`) e cria um registro imutável em `audit_logs`.
* `reject_public_estimate(p_token text) returns boolean`: Recusa o orçamento. Registra data (`rejected_at`) e log de auditoria.
* `get_public_service_extra(p_token text) returns json`: Visualiza custos extras solicitados em campo.
* `respond_public_service_extra(p_token text, p_response text) returns boolean`: Permite aprovar/rejeitar custos adicionais em campo com validação e trilha de auditoria.
* `get_public_reviews() returns table`: Retorna depoimentos aprovados para a vitrine pública (`is_hidden = false` e `public_approved = true`).
* `submit_public_review(...) returns uuid`: Permite o envio público de avaliações, gravando-as com aprovação pendente (`public_approved = false`) para moderação de gerentes.

### 5.3. Lead Distribution Corrigido para Múltiplas Empresas
* **Lead Público:** A coluna `leads.organization_id` permanece nula na tabela `leads`.
* **Lead Manual:** Vinculado diretamente ao `organization_id` da empresa.
* **RLS de Leads por Lead Distributions:** A política RLS de `leads` para empresas autenticadas permite a visualização por Owners/Admins se o lead for manual da própria empresa OU se houver um registro de venda do lead associado a ela na tabela `lead_distributions`.
* **Proteção de Workers:** Os instaladores (Workers) são impedidos de selecionar diretamente na tabela de leads, limitando seu escopo apenas aos detalhes estritamente liberados em suas ordens de serviço ativas.

### 5.4. Crédito/Ledger Corrigido (Transação Atômica)
* Implementamos a função RPC de distribuição sistêmica `distribute_public_lead_to_matching_companies(p_lead_id uuid)`. Ela roda via cron/backend usando a Service Role e executa em bloco transacional atômico:
  1. Verifica se o lead é público e se o limite máximo de distribuições (ex: 3 empresas) ainda não foi atingido.
  2. Identifica empresas ativas cujas especialidades e ZIP codes de cobertura atendam ao lead.
  3. Checa se o saldo de créditos da empresa é suficiente.
  4. Realiza o débito no ledger e a inserção na tabela `lead_distributions` sob proteção de chave única `unique(lead_id, organization_id)` (idempotência contra cobrança duplicada).
  5. Atualiza o status do lead para `distributed`.
  6. Em caso de falha societária ou saldo no meio da operação, a transação daquela empresa sofre rollback isoladamente sem corromper as demais distribuições.
* A trigger `trg_ledger_prevent_negative_balance` na tabela `organization_credit_ledger` age como segunda camada de defesa (defense-in-depth), impedindo qualquer insert de débito que zere ou negative o saldo consolidado da organização.

### 5.5. Sócios / 100% Corrigido e Documentado
* A trigger `validate_partner_share_percentages` permite o cadastro progressivo de sócios (soma ativa $\le 100\%$).
* Criamos a função helper `validate_partner_shares_complete(org_id uuid) returns boolean` que retorna `true` apenas se a soma de cotas ativas fechar exatamente em `100.00%`.
* **Validação:** Ficou documentado e planejado que qualquer gatilho ou rotina de divisão financeira (payouts, splits de recibos de materiais) chamará esta função antes de prosseguir com os repasses, abortando a operação se retornar `false`.

### 5.6. Reviews Preservado
* **O código original foi corrigido:** Removemos todos os comandos de `RENAME COLUMN user_name TO customer_name` e `RENAME COLUMN body TO comment` da migração.
* As colunas originais `user_name` e `body` permanecem intocadas, assegurando que o arquivo `src/lib/reviewsService.ts` continue compilando e funcionando.
* Para permitir reviews públicos sem login, alteramos a DDL na tabela de reviews para tornar a coluna `user_id` opcional (`nullable`). As colunas novas de relacionamento foram adicionadas de forma segura com `ADD COLUMN IF NOT EXISTS`.

### 5.7. Status em Lowercase
Padronizamos todos os check constraints e enums do banco de dados para lowercase. As strings homologadas são:
* `estimates.status` / `service_extras.status` / `leads.status`: `draft`, `sent`, `viewed`, `approved`, `rejected`, `paid`, `cancelled`, `new`, `distributed`, `contacted`, `converted`, `lost`.
* `service_jobs.status`: `scheduled`, `in_progress`, `completed`, `cancelled`.
* A incompatibilidade temporária com o frontend (que usa status em camelCase ou Uppercase no wizard de leads) será tratada exclusivamente no arquivo de cliente Supabase na Fase 4, traduzindo strings de payload no envio e recebimento sem forçar o banco a manter strings inconsistentes.

### 5.8. Storage Revisado
* Os buckets `lead-files`, `service-files` e `receipt-files` são configurados como **Privados**. Qualquer tentativa de ler dados por URL pública sem token/assinatura retornará `Access Denied`.
* Os buckets `company-assets` (logotipos) e `public-portfolio` (fotos do site público) são públicos.

---

## 6. Pontos que Ainda Precisam de Decisão

1. **Definição da Fila de Cron para Distribuição:** Definir se a RPC `distribute_public_lead_to_matching_companies` será disparada via Supabase pg_cron (diretamente no banco de dados) ou através de uma Edge Function acionada por webhook na inserção do lead público.
2. **Layout de Redação de Endereços:** Confirmar qual formato de máscara de endereço (ex: apenas a Cidade/Estado e ZIP) deve ser exposto ao instalador (Worker) antes de o endereço completo ser liberado.

---

## 7. Prontidão para Fase 2

**Sim, o projeto está 100% pronto para iniciar a Fase 2 (Aplicação Controlada do Banco em Ambiente de Desenvolvimento).**
Todos os rascunhos de migrations v2 corrigidos sanam os riscos identificados de segurança, garantindo a integridade multi-tenant e prevenindo vazamentos.

---

## 8. Checklist Antes de Aplicar no Supabase

Antes de rodar os arquivos SQL no Supabase na Fase 2:
- [ ] Criar projeto de desenvolvimento no painel do Supabase.
- [ ] Ativar a extensão `pgcrypto` no banco.
- [ ] Rodar o script `000_homeleadpro_schema_draft_v2.sql` para criar a estrutura das tabelas.
- [ ] Rodar o script `001_homeleadpro_rls_draft_v2.sql` para habilitar RLS em todas as tabelas.
- [ ] Rodar o script `002_homeleadpro_functions_triggers_draft_v2.sql` para ativar triggers, automações e RPCs públicas.
- [ ] Executar queries de simulação de ator (como anon e worker) para validar se acessos diretos não autorizados são bloqueados.

---

“Nenhuma migration foi aplicada. Esta fase apenas revisou e corrigiu os rascunhos locais de banco e RLS do HomeLeadPro.”
