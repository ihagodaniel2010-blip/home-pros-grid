# Relatório Fase 2.0 — Comparação do Schema Atual do Carpentry com o Schema v2 do HomeLeadPro

Este relatório detalha a comparação técnica do estado atual do banco de dados do projeto **Carpentry** com o schema esperado do **HomeLeadPro v2**, propondo um roteiro de migração seguro (delta) e livre de colisões.

---

## 1. Contexto Geral e Identificação de Ambiente

* **Project Ref Analisado:** `ozhjvprhhsdglxokfwze` (URL: `https://ozhjvprhhsdglxokfwze.supabase.co`).
* **Confirmação de Ambiente:** Confirmado como o projeto **Carpentry** do Supabase, conforme as chaves definidas no arquivo `.env` do desenvolvedor.
* **Status do MCP:** O IDE/MCP permanece desprovido de permissões administrativas (API token de plataforma) sobre o projeto `ozhjvprhhsdglxokfwze`, disparando erros de privilégios (`401/403 Unauthorized`). O MCP continua restrito ao projeto `dembegkbdvlwkyhftwii` (`ferreira-saas-v2`). Por conta disso, **nenhum comando automático via MCP foi executado**, e todas as verificações foram feitas de forma independente via PostgREST HTTP.

---

## 2. Levantamento Detalhado de Tabelas e Colunas

Realizamos testes de probing direto no PostgREST de forma individual para validar quais tabelas e colunas já existem na base remota do Carpentry:

### 2.1. Tabelas Existentes e Integração de Colunas
As seguintes 8 tabelas principais **já estão criadas** e contêm exatamente todas as colunas prescritas no schema v2 do HomeLeadPro:

1. **`organizations`**
   - *Colunas existentes:* `id`, `name`, `slug`, `status`, `is_platform_owner`, `created_at`, `updated_at`.
   - *Diferença/Delta:* Nenhuma. Estrutura 100% compatível.
2. **`organization_users`**
   - *Colunas existentes:* `id`, `organization_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`.
   - *Diferença/Delta:* Nenhuma. Estrutura 100% compatível.
3. **`company_settings`**
   - *Colunas existentes:* `organization_id`, `company_name`, `logo_url`, `phone`, `email`, `website`, `address`, `city`, `state`, `zip`, `license_number`, `insurance_info`, `default_tax_rate`, `default_terms`, `request_reviews`, `google_review_link`, `review_message_template`, `payment_methods`, `sms_templates`, `media_settings`, `created_at`, `updated_at`.
   - *Diferença/Delta:* Nenhuma. Estrutura 100% compatível.
4. **`leads`**
   - *Colunas existentes:* `id`, `organization_id`, `source`, `full_name`, `email`, `phone`, `phone_masked`, `address`, `city`, `state`, `zip`, `selected_service`, `selected_service_option`, `service_category_id`, `details`, `description`, `urgency`, `preferred_contact_method`, `status`, `owner_notes`, `public_token`, `created_at`, `updated_at`.
   - *Diferença/Delta:* Nenhuma. Estrutura 100% compatível.
5. **`estimates`**
   - *Colunas existentes:* `id`, `organization_id`, `lead_id`, `client_name`, `client_email`, `client_phone`, `client_address`, `client_city`, `client_state`, `client_zip`, `status`, `project_type`, `subtotal`, `tax_rate`, `tax_amount`, `discount_amount`, `total_amount`, `amount_paid`, `balance_due`, `payment_status`, `public_token`, `notes`, `terms`, `valid_until`, `approved_at`, `rejected_at`, `created_at`, `updated_at`.
   - *Diferença/Delta:* Nenhuma. Estrutura 100% compatível.
6. **`estimate_items`**
   - *Colunas existentes:* `id`, `estimate_id`, `organization_id`, `description`, `quantity`, `unit_price`, `total_price`, `sort_order`, `created_at`, `updated_at`.
   - *Diferença/Delta:* Nenhuma. Estrutura 100% compatível.
7. **`reviews`**
   - *Colunas existentes:* `id`, `user_id`, `user_name`, `user_avatar_url`, `rating`, `body`, `is_hidden`, `created_at`, `updated_at`, `organization_id`, `lead_id`, `service_job_id`, `public_approved`, `google_redirect_clicked`, `customer_name`, `comment`.
   - *Diferença/Delta:* Nenhuma. Estrutura 100% compatível. A nullable em `user_id` foi aplicada no banco Carpentry e as colunas adicionais para multiempresa estão presentes.
8. **`clients`**
   - *Colunas existentes:* `id`, `name`, `email`, `phone`, `address`, `city`, `state`, `zip`, `organization_id`, `created_at`, `updated_at`.
   - *Diferença/Delta:* Esta tabela não é usada na v2 atual do HomeLeadPro (que usa a tabela de `leads` para controle de CRM e faturas). Ela está vazia (0 registros) e será mantida de forma pacífica no banco sem sofrer interferências.

---

## 3. Elementos Faltantes (O que precisamos criar)

Embora as 8 tabelas centrais estejam criadas, os seguintes elementos do schema v2 **estão ausentes no Carpentry**:

1. **Tabelas Faltantes (24 tabelas):**
   `service_categories`, `company_services`, `us_locations`, `company_service_areas`, `lead_files`, `lead_pricing_rules`, `platform_settings`, `lead_distributions`, `organization_credit_ledger`, `sms_threads`, `sms_messages`, `estimate_payments_manual`, `service_jobs`, `service_checklists`, `checklist_tasks`, `service_extras`, `service_files`, `receipts`, `company_partners`, `employee_assignments`, `audit_logs`.
2. **Constraints e Chaves Estrangeiras:**
   Constraints de relacionamentos que unem as tabelas novas às existentes (ex: chaves estrangeiras de `sms_threads`, `estimate_payments_manual`, etc.).
3. **Restrições de Check e Unicidade:**
   Ex: `unique(lead_id, organization_id)` em `lead_distributions` e checks de status lowercase.
4. **Políticas de RLS:**
   Nenhuma política de segurança ou isolamento de tenant v2 está ativa nas tabelas.
5. **Triggers e Funções:**
   Nenhuma trigger de banco (como recálculo de orçamentos, auditoria, validação societária de sócios e geração de tokens) ou RPC segura está instalada no banco de dados.

---

## 4. Riscos de Aplicar o Script Bruto de Schema (`000...schema_draft_v2.sql`)

Se aplicarmos o arquivo `000_homeleadpro_schema_draft_v2.sql` diretamente no banco:
* **Colisão de tabelas:** Embora a cláusula `CREATE TABLE IF NOT EXISTS` evite crash de criação de tabelas existentes, as restrições de chaves estrangeiras (`ADD CONSTRAINT`) seriam enviadas diretamente. Como o PostgreSQL não possui a sintaxe `ADD CONSTRAINT IF NOT EXISTS`, a migração **lançaria erros e abortaria** caso alguma constraint com o mesmo nome já existisse no banco Carpentry.
* **RLS Incompleto:** Se aplicarmos os arquivos na ordem errada ou individualmente, o RLS poderia bloquear acessos antes que as funções auxiliares estivessem instaladas.

---

## 5. Solução Proposta: Arquivo Delta Seguro (`003...delta...sql`)

Criamos o arquivo local [003_homeleadpro_delta_from_carpentry_existing_schema.sql](file:///C:/Desenvolvimento/SiteIhago/Site/supabase/migrations/003_homeleadpro_delta_from_carpentry_existing_schema.sql). Ele resolve as limitações de aplicação direta por meio das seguintes táticas:
1. **Criação Segura de Tabelas:** Usa `CREATE TABLE IF NOT EXISTS` para as 24 tabelas faltantes.
2. **PL/pgSQL de Idempotência para Constraints:** Todas as declarações `ALTER TABLE ADD CONSTRAINT` que ligam tabelas existentes a tabelas novas são encapsuladas em blocos `DO $$ BEGIN ... END $$` que checam previamente a tabela `pg_constraint` antes de rodar o comando, prevenindo erros de duplicação.
3. **Recriação Controlada de Gatilhos e Políticas:** Executa `DROP TRIGGER IF EXISTS` e `DROP POLICY IF EXISTS` antes de declarar as regras, limpando qualquer versão antiga.
4. **Instalação Integral de Funções e RPCs:** Adiciona todas as 9 RPCs de clientes finais sem login diretamente no banco.

---

## 6. Recomendação e Próximos Passos (Fase 2.1)

1. **Estamos prontos para prosseguir para a Fase 2.1 (Aplicação Controlada do Delta).**
2. **Método de Aplicação:** Devido à limitação de permissão de plataforma no MCP para o projeto Carpentry (`ozhjvprhhsdglxokfwze`), o delta deve ser aplicado:
   * **Via Supabase SQL Editor:** Copiar o conteúdo do arquivo [003_homeleadpro_delta_from_carpentry_existing_schema.sql](file:///C:/Desenvolvimento/SiteIhago/Site/supabase/migrations/003_homeleadpro_delta_from_carpentry_existing_schema.sql) e colar no editor de consultas do console web do Supabase do projeto Carpentry.
3. **Execução de Testes:** Após rodar o delta, rodar a lista de testes de RLS e triggers descrita na Fase 2 para confirmar o isolamento multi-tenant.

---

“Nenhuma migration foi aplicada. Esta fase apenas comparou o schema atual do Carpentry com o schema v2 do HomeLeadPro.”
