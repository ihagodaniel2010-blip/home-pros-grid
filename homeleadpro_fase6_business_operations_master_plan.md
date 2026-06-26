# Fase 6.0 — Business Operations Master Plan

Este plano mestre reorienta o HomeLeadPro/Barrigudo para ir além do marketplace de leads, estabelecendo a fundação como um Sistema Operacional completo para empresas de construção e remodelação (Operations OS).

## 1. Auditoria do Estado Atual (Fase 5.6.2)

Após a auditoria do schema do Supabase e das migrações anteriores (até `010`), mapeamos o que já existe:

### O que já existe e pode ser reaproveitado:
- **`leads` e `lead_distributions`**: Funcionais e isolados por RLS.
- **`estimates` e `estimate_items`**: Prontos para receber o output do Smart Estimate Assistant.
- **`service_jobs` e `service_extras`**: Funcionando com isolamento por tenant.
- **`estimate_payments_manual`**: Tabela base para registro de pagamentos de clientes (Payments). Contém `amount`, `method` e `note`.
- **`organization_credit_ledger`**: Tabela de transações financeiras para leads, que pode inspirar o ledger de reembolsos ou ser expandida.
- **`company_partners`**: Tabela que define sócios e divisões de lucros (50/50, etc).
- **`receipts`**: Já existe uma tabela `receipts`, mas atualmente exige `service_job_id` (NOT NULL). Ela possui suporte inicial a `reimbursement_status`, `vendor`, `paid_by_user_id`.
- **`files`**: `service_files` e `lead_files` já com suporte a anexos (PDFs/imagens).

### O que está parcial (Precisa de Alterações):
- **`receipts`**: Restrita a Jobs. Para servir ao **Receipt & Expense Center**, o `service_job_id` deve ser anulável e precisamos de uma coluna `expense_category` (company_expense, job_material, etc.).
- **`estimate_payments_manual`**: Para atuar como **Client Receipts**, precisa receber uma coluna `public_token` e status do envio do recibo.
- **Reimbursements**: Parcialmente coberto por `reimbursement_status` na tabela `receipts`, mas falta um ledger claro de acertos de contas (quem deve quem).

### O que NÃO existe (Novas Tabelas e Módulos):
- **Smart Estimate Assistant**: Não há tabelas de templates de prompt ou histórico de conversas da IA. O MVP pode começar apenas no Frontend gerando `estimate_items`.
- **Tax Center**: Nenhuma tabela para documentos fiscais (EIN, W9, Bank Statements) por ano fiscal (`tax_years`, `tax_documents`).
- **Notifications**: Nenhuma tabela de central de notificações in-app.

---

## 2. Roadmap Completo de Implementação (Fase 6)

A implementação será fragmentada nas seguintes sub-fases para garantir estabilidade e testes iterativos (nenhuma migração destrutiva):

- **Fase 6.0** — Auditoria e plano mestre (Atual)
- **Fase 6.1** — Receipt & Expense Center (Expansão da tabela `receipts`)
- **Fase 6.2** — Reimbursements (Lógica de acerto de contas entre sócios/empresa)
- **Fase 6.3** — Client Receipts & Payments (Geração de recibos públicos via `estimate_payments_manual`)
- **Fase 6.4** — Smart Estimate Assistant (Geração de `estimates` via chat UI)
- **Fase 6.5** — Tax Center / Year-End Package (Gestão de documentos anuais)
- **Fase 6.6** — Notifications Center
- **Fase 6.7** — Reports / Company Dashboard

---

## 3. Arquivos SQL Propostos (Arquitetura)

*NOTA: Estes SQLs não serão aplicados nesta fase, apenas mapeados.*

### `011_homeleadpro_business_operations_foundation.sql`
- Ajustes de permissões genéricas.
- Criação de enums e tipos base para despesas.

### `012_homeleadpro_receipts_expenses_reimbursements.sql`
- **ALTER TABLE `receipts`**:
  - `ALTER COLUMN service_job_id DROP NOT NULL;`
  - `ADD COLUMN expense_category text;` (company_expense, job_material, client_reimbursable, owner_reimbursable, etc.)
  - `ADD COLUMN payment_method text;` (company_card, company_account, personal_card_owner_1, etc.)
- **CREATE TABLE `reimbursement_ledger`** (para trackear pagamentos de reembolsos pendentes).

### `013_homeleadpro_client_receipts_payments.sql`
- **ALTER TABLE `estimate_payments_manual`**:
  - `ADD COLUMN public_token text unique;`
  - `ADD COLUMN receipt_status text default 'draft';` (draft, sent, viewed)
  - `ADD COLUMN viewed_at timestamptz;`

### `014_homeleadpro_estimate_assistant.sql`
- **CREATE TABLE `estimate_templates`**: Categorias de templates para o MVP (ex: Plumbing, Roofing) com listas de perguntas sugeridas.

### `015_homeleadpro_tax_center_year_end_package.sql`
- **CREATE TABLE `tax_years`**: Ano fiscal, status (open, filed).
- **CREATE TABLE `tax_documents`**: Links do storage para EIN, W9, extratos bancários, vinculados a um `tax_year`.

### `016_homeleadpro_notifications_center.sql`
- **CREATE TABLE `notifications`**: user_id, title, body, is_read, type.

---

## 4. Navegação e Menu Admin

**Novo Menu Principal (`/admin/`):**
1. **Estimate Assistant** (`/admin/estimate-assistant`)
2. **Receipts & Expenses** (`/admin/expenses`)
3. **Reimbursements** (`/admin/reimbursements`)
4. **Client Receipts** (`/admin/client-receipts` ou dentro de jobs/payments)
5. **Tax Center** (`/admin/tax`)

**Controle de Acesso (RLS e Frontend):**
- **Owner / Admin**: Acesso total a todos os menus.
- **Worker**: Acesso bloqueado a Tax Center, Reimbursements e Financeiro. Pode visualizar apenas seus jobs. Futuramente, permissão apenas para `INSERT` de receipt vinculado ao seu `service_job_id`.
- **Super Admin**: Acesso à plataforma para suporte.

---

## 5. Prioridade Prática de Implementação

A ordem sugerida e validada por dependência técnica:
1. **Receipt & Expense Center**: Mais rápido de implementar (alterar tabela existente) e gera valor imediato de organização financeira diária.
2. **Reimbursements**: Depende do Expense Center estar rodando para puxar despesas pagas com cartão pessoal.
3. **Client Receipts & Payments**: Fundamental para passar profissionalismo pro cliente (aproveita a base de pagamentos existente).
4. **Smart Estimate Assistant**: Funcionalidade core que aumenta a conversão, mas não bloqueia a contabilidade atual. MVP via frontend é o ideal inicial.
5. **Tax Center**: Depende de todas as despesas (Receipts) e receitas (Payments) estarem consolidadas para fechar o ano.
6. **Notifications & Reports**: Dashboards visuais construídos por último quando a massa de dados existir.

---

## 6. Segurança e Isolamento (RLS)

- **Regra de Ouro**: Todas as novas tabelas (`tax_documents`, `reimbursement_ledger`) e tabelas modificadas (`receipts`, `estimate_payments_manual`) DEVEM possuir `organization_id` e RLS restrito.
- **Bloqueio Vertical**: Usuários com `role = 'worker'` não podem fazer `SELECT` nessas tabelas, protegendo dados sensíveis da empresa (lucros, saques de sócios, pagamentos a contractors).
- **Storage Buckets**: Criação de uma política no bucket Supabase para que pastas como `/tax_documents` só possam ser lidas por Owners/Admins da organização correspondente. Não permitir acesso anônimo em arquivos financeiros.
