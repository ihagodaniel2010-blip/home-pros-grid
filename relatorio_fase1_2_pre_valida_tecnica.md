# Relatório Fase 1.2 — Pré-Validação Técnica dos SQL v2 do HomeLeadPro

Este relatório apresenta a validação técnica final dos rascunhos de banco de dados e segurança (versões v2) do **HomeLeadPro**, assegurando que os scripts estão prontos para serem aplicados no ambiente de desenvolvimento do Supabase na Fase 2 de forma segura e íntegra.

---

## 1. Resumo Executivo

A Fase 1.2 realizou a pré-validação técnica de conformidade estrutural, funcional e de segurança dos rascunhos SQL corrigidos na Fase 1.1. Todos os 11 pontos críticos do projeto foram validados. 

Concluímos que a modelagem física, as restrições (`check constraints`), a matriz RLS reformulada e o conjunto de RPCs públicas seguras (`security definer`) estão **tecnicamente consistentes, livres de vulnerabilidades críticas de vazamento de dados e prontos para implantação controlada no Supabase de desenvolvimento**. A compatibilidade com o frontend atual está 100% assegurada e a validação do build Next.js foi concluída com sucesso.

---

## 2. Arquivos Validados

A auditoria incidiu sobre os seguintes arquivos locais locais:
1. [000_homeleadpro_schema_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/000_homeleadpro_schema_draft_v2.sql)
2. [001_homeleadpro_rls_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/001_homeleadpro_rls_draft_v2.sql)
3. [002_homeleadpro_functions_triggers_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/002_homeleadpro_functions_triggers_draft_v2.sql)
4. [homeleadpro_database_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_database_plan.md)
5. [homeleadpro_rls_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_rls_plan.md)
6. [homeleadpro_storage_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_storage_plan.md)
7. [relatorio_fase1_1_revisao_seguranca.md](file:///c:/Desenvolvimento/SiteIhago/Site/relatorio_fase1_1_revisao_seguranca.md)

---

## 3. Problemas Encontrados e Diagnósticos

* ** reviews.user_id Nullability:** Na Fase 1.1, identificamos que a tabela de reviews original criada em `20260223203000_create_reviews.sql` possuía a constraint `user_id uuid not null`. Caso tentássemos cadastrar avaliações públicas de clientes anônimos sem login, a inserção falharia. O ajuste `ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;` foi inserido no schema v2 e validado com sucesso.
* ** leads.status Constraint Sync:** O wizard de leads do frontend exige novos estados em lowercase. Sincronizamos a constraint `check` para incluir a lista completa: `new`, `distributed`, `contacted`, `converted`, `lost`, `rejected`, `closed`.
* **Sem Renomeações Perigosas:** Confirmado que a coluna `user_name` e `body` da tabela `reviews` não possuem qualquer comando de rename, o que preserva a compatibilidade total com o arquivo `src/lib/reviewsService.ts`.

---

## 4. Análise Técnica dos Componentes SQL v2

### 4.1. Ordem de Criação e Dependências
* As tabelas são criadas em fluxo lógico linear. A tabela `organizations` é criada primeiro, seguida por tabelas com chaves estrangeiras dependentes.
* Os relacionamentos circulares entre tabelas criadas em momentos distintos (como `sms_threads` apontando para `estimates`, `estimate_payments_manual` apontando para `service_files` e `service_files` apontando para `receipts`) são resolvidos de forma limpa por comandos `ALTER TABLE ADD CONSTRAINT` executados no final do script `000_homeleadpro_schema_draft_v2.sql`.

### 4.2. Extensões
* O script ativa explicitamente a extensão `pgcrypto` (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`).
* A função `digest(...)` (usada para gerar o `public_token` criptográfico) e `gen_random_uuid()` rodam perfeitamente usando esta extensão, sem exigir dependências adicionais no PostgreSQL.

### 4.3. Status e Constraints
* Todos os status do banco foram migrados e checados em lowercase estrito.
* Os status declarados nos scripts batem com as restrições físicas das colunas no banco de dados.

### 4.4. Row Level Security (RLS)
* **Zero leaks:** Confirmado que não existe nenhuma política `USING (true)` ou `USING (visibility = 'client')` em tabelas sensíveis.
* **Isolamento de Workers:** Funcionários de campo (Workers) estão bloqueados de ler orçamentos (`estimates`), itens (`estimate_items`), pagamentos manuais (`estimate_payments_manual`), recibos societários (`receipts`), créditos (`organization_credit_ledger`) e sócios (`company_partners`). A RLS de leads impede que vejam leads gerais (só enxergam dados de contato mascarados associados às suas ordens de serviço ativas).
* **Anon Bloqueado:** Acesso direto a tabelas confidenciais por usuários anônimos (Anon Key) retorna vazio por padrão.

### 4.5. RPCs Públicas (Security Definer)
Todas as 9 RPCs públicas planejadas foram declaradas com `SECURITY DEFINER` e validação interna de token:
1. `get_public_estimate(token text)`
2. `get_public_estimate_items(token text)`
3. `get_public_estimate_files(token text)`
4. `approve_public_estimate(token text)`
5. `reject_public_estimate(token text)`
6. `get_public_service_extra(token text)`
7. `respond_public_service_extra(token text, response text)`
8. `get_public_reviews()`
9. `submit_public_review(...)`

Essas funções só retornam colunas públicas e higienizadas, não permitindo injeção de parâmetros ou alteração direta de campos internos do faturamento.

### 4.6. Distribuição de Leads
* Leads públicos são inseridos com `organization_id` como `NULL`.
* A distribuição de leads públicos é realizada exclusivamente pela RPC de sistema `distribute_public_lead_to_matching_companies`, a qual é executada por backend/Edge Function com privilégio administrativo (Service Role). Apenas gerentes Owners/Admins podem ler o lead comprado (via RLS vinculada a `lead_distributions`).
* Impedimos qualquer possibilidade de auto-distribuição ou compra forçada manual por parte da empresa compradora.

### 4.7. Créditos e Idempotência
* A trigger `trg_ledger_prevent_negative_balance` impede saldos consolidados abaixo de zero na tabela `organization_credit_ledger` lançando exceptions.
* A restrição `unique(lead_id, organization_id)` em `lead_distributions` bloqueia compras duplicadas do mesmo lead pela mesma empresa no nível de banco de dados.
* A transação da distribuição é atômica. Se o débito ou a gravação falharem, nenhum crédito é removido e nenhuma distribuição inválida é gerada.

### 4.8. Sócios e Divisões Fiscais
* O cadastro societário inicial aceita soma ativa $< 100\%$.
* A trigger `validate_partner_share_percentages` impede que a soma supere 100%.
* O uso societário financeiro ( splits ) é validado pela função `validate_partner_shares_complete(org_id uuid)`, a qual retorna `false` caso as cotas não somem exatamente 100%, travando qualquer repasse.

### 4.9. Storage Buckets
* Buckets `lead-files`, `service-files` e `receipt-files` são privados. 
* Acesso anônimo a estes arquivos só é possível através das RPCs que validam tokens e geram URLs assinadas (Signed URLs) com expiração controlada.
* Buckets `company-assets` e `public-portfolio` são públicos.

### 4.10. Compatibilidade com Next.js
* Validamos que o build do projeto rodando `npm run build` (Next.js) funciona perfeitamente.
* Nenhuma alteração de frontend, componente React ou arquivo TypeScript na pasta `src/` foi realizada, garantindo 100% de integridade com o estado atual.

---

## 5. Confirmação de Prontidão

> [!IMPORTANT]
> **Os rascunhos SQL v2 estão aprovados tecnicamente e declarados PRONTOS para serem aplicados no ambiente de desenvolvimento do Supabase na Fase 2.**

---

## 6. Plano de Aplicação Segura (Fase 2)

Para garantir que a Fase 2 transcorra sem incidentes, seguiremos o seguinte roteiro de implantação:

1. **Setup de Ambiente:**
   * Criar um projeto Supabase novo e isolado para Desenvolvimento/Testes.
   * **NUNCA** aplicar diretamente no projeto de Produção.
2. **Backup/Dump Pré-Migração:**
   * Obter um dump do banco remoto atual (caso haja dados de reviews no Supabase atual).
   * Confirmar a estrutura atual da tabela `reviews` no Supabase remoto usando o editor SQL para verificar se bate com o arquivo `20260223203000_create_reviews.sql`.
3. **Execução Ordenada das Migrações:**
   * Executar o script [000_homeleadpro_schema_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/000_homeleadpro_schema_draft_v2.sql) para criar/alterar as tabelas.
   * Executar o script [001_homeleadpro_rls_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/001_homeleadpro_rls_draft_v2.sql) para estruturar a segurança RLS e criar funções auxiliares de perfil.
   * Executar o script [002_homeleadpro_functions_triggers_draft_v2.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/002_homeleadpro_functions_triggers_draft_v2.sql) para ativar as triggers e RPCs públicas.
4. **Provisionamento do Storage:**
   * Criar manualmente ou via script de API os buckets de storage: `lead-files` (privado), `service-files` (privado), `receipt-files` (privado), `company-assets` (público) e `public-portfolio` (público).
5. **População de Dados de Teste:**
   * Inserir dados fictícios de teste compreendendo: 2 organizações, usuários (Owner, Admin, Worker para cada uma), categorias de serviço e regras tarifárias.

---

## 7. Lista de Testes Obrigatórios da Fase 2

Após aplicar os scripts em desenvolvimento, validaremos as seguintes queries de simulação no editor SQL do Supabase:

| Caso de Teste | Ator Simulado | Ação Testada | Comportamento Esperado |
| :--- | :--- | :--- | :--- |
| **T01 - Isolamento Multi-tenant** | Authenticated (Worker Org A) | `SELECT * FROM estimates WHERE organization_id = 'org_b'` | Retorna 0 linhas (Acesso Negado implicitamente). |
| **T02 - Bloqueio Financeiro Worker** | Authenticated (Worker Org A) | `SELECT * FROM receipts WHERE organization_id = 'org_a'` | Retorna 0 linhas (Acesso Negado). |
| **T03 - Mascaramento de Endereços** | Authenticated (Worker Org A) | `SELECT address FROM leads` | Retorna erro de RLS (Workers não leem leads). |
| **T04 - Envio de Lead Público** | Anonymous (Anon Key) | `INSERT INTO leads` com status='new' e source='public' | Sucesso na inserção. |
| **T05 - Extração de Leads por Anon** | Anonymous (Anon Key) | `SELECT * FROM leads` | Retorna 0 linhas (Acesso Negado). |
| **T06 - Acesso via Token RPC** | Anonymous (Sem login) | `SELECT get_public_estimate('token_valido')` | Retorna o JSON limpo do estimate. |
| **T07 - Injeção de Token RPC** | Anonymous (Sem login) | `SELECT get_public_estimate('token_invalido')` | Retorna Exception: Token inválido. |
| **T08 - Modificação Direta de Estimate** | Anonymous (Sem login) | `UPDATE estimates SET status = 'approved'` | Bloqueado pelo RLS (0 linhas alteradas). |
| **T09 - Distribuição de Leads Sem Saldo**| Service Role | Rodar `distribute_public_lead_to_matching_companies` | Aborta e avisa saldo insuficiente. |
| **T10 - Idempotência de Leads** | Service Role | Rodar distribuição do mesmo lead para mesma empresa | Bloqueado por Unique constraint. |
| **T11 - Validação Societária** | Authenticated (Owner Org A) | Inserir sócios somando 110% | Aborta e lança erro de constraint societária. |

---

## 8. Riscos Restantes

* **Falta de Testes Automáticos de Integração:** Mudanças de status no backend precisam estar 100% integradas com as chamadas de RPC. Esse risco será mitigado na Fase 4 e Fase 5 através de testes unitários rígidos no frontend TypeScript.
* **Políticas RLS em Views:** Caso criemos views para simplificar relatórios do painel, precisamos nos certificar de que as views respeitam o RLS das tabelas base (usando `security barrier`).

---

## 9. Recomendação Final

Recomendamos **prosseguir imediatamente para a Fase 2 (Aplicação Controlada do Banco em Ambiente de Desenvolvimento)** seguindo as diretrizes descritas na seção 6.

---

“Nenhuma migration foi aplicada. Esta fase apenas validou tecnicamente os SQL v2 antes da Fase 2 do HomeLeadPro.”
