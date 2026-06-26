# Resumo Executivo: Fase 6.0 — Business Operations Master Plan

Este relatório apresenta o diagnóstico e o planejamento mestre da Fase 6.0, que marca a transição do HomeLeadPro de um marketplace de leads para um Sistema Operacional (OS) completo para gestão da empresa.

## 1. Onde paramos depois da Fase 5.6.2
Concluímos com sucesso o motor de compra, auto-distribuição e inbox de leads públicos. As empresas já conseguem competir por leads e ter seus créditos (`organization_credit_ledger`) debitados corretamente. O fluxo parava antes da gestão da execução e financeira do serviço.

## 2. O que já existe no sistema
- Cadastro de empresas, filiais e usuários (`organizations`, `organization_users`, `company_settings`, `company_partners`).
- Motor financeiro básico (`organization_credit_ledger` focado em leads).
- Orçamentos e controle de tarefas (`estimates`, `estimate_items`, `service_jobs`, `service_extras`, `checklists`).
- Pagamentos manuais atrelados a orçamentos (`estimate_payments_manual`).
- Recibos vinculados exclusivamente a Jobs (`receipts`).
- Sistema de anexos genérico (`lead_files`, `service_files`).

## 3. O que precisa ser reaproveitado
- **`receipts`**: Em vez de criar uma tabela nova de despesas, vamos alterar a tabela atual para aceitar `company_expense` (removendo a obrigatoriedade de `service_job_id`) e expandir o método de pagamento e quem pagou.
- **`estimate_payments_manual`**: Será a base para os recibos de clientes (Payments & Client Receipts), bastando adicionar colunas de token público e status.
- **`company_partners`**: Fundamental para cruzar dados com reembolsos entre a empresa e os sócios.

## 4. O que precisa ser criado
- **Reimbursement Ledger**: Uma nova tabela ou fluxo derivado para acerto de contas (`Company owes Hugo`, `Client owes company`, etc.).
- **Smart Estimate Assistant**: Tabelas de templates e integração de IA via frontend.
- **Tax Center**: Tabelas para agrupar documentos por `tax_year` (`tax_documents`, `tax_years`).
- **Notifications Center**: Tabela de `notifications` in-app.

## 5. Roadmap completo da Fase 6
- **Fase 6.0** — Auditoria e plano mestre (Concluída neste documento)
- **Fase 6.1** — Receipt & Expense Center
- **Fase 6.2** — Reimbursements
- **Fase 6.3** — Client Receipts & Payments
- **Fase 6.4** — Smart Estimate Assistant
- **Fase 6.5** — Tax Center / Year-End Package
- **Fase 6.6** — Notifications Center
- **Fase 6.7** — Reports / Company Dashboard

## 6. SQLs propostos por módulo
- `011_homeleadpro_business_operations_foundation.sql` (Enums e ajustes gerais)
- `012_homeleadpro_receipts_expenses_reimbursements.sql` (Expense Center e Reembolsos)
- `013_homeleadpro_client_receipts_payments.sql` (Pagamentos de Clientes)
- `014_homeleadpro_estimate_assistant.sql` (Smart Estimate)
- `015_homeleadpro_tax_center_year_end_package.sql` (Gestão Fiscal)
- `016_homeleadpro_notifications_center.sql` (Notificações)

## 7. Telas propostas
- `/admin/estimate-assistant`: Chat UI e templates de orçamentos.
- `/admin/expenses`: Upload de recibos, classificação (job, company) e método (Zelle, card, pessoal).
- `/admin/reimbursements`: Painel de devoluções (Sócio ↔ Empresa ↔ Cliente).
- `/admin/client-receipts`: Geração e envio de links de recibos de pagamentos.
- `/admin/tax`: Painel contábil de fim de ano.

## 8. Permissões/RLS propostas
- **Owner / Admin**: Acesso de leitura/escrita a todos os módulos financeiros e operacionais (separados por `organization_id`).
- **Worker**: Sem acesso aos módulos financeiros (`expenses`, `reimbursements`, `tax`). Visibilidade restrita aos jobs atribuídos. Poderá fazer INSERT de recibos atrelados ao seu próprio Job (futuro).
- **Isolamento de Tenant**: Todo registro *deve obrigatoriamente* possuir `organization_id`.

## 9. Storage/buckets necessários
É necessário criar/adaptar buckets e pastas no Supabase Storage:
- `receipts/`: Para fotos de notas fiscais de despesas.
- `tax_documents/`: Para W9, EIN, Extratos, separados rigorosamente por tenant via RLS.
- O RLS do bucket deve bloquear o acesso público para esses documentos sensíveis.

## 10. Ordem recomendada de implementação
A prioridade prática definida é iniciar pelas finanças internas para controle rápido do fluxo de caixa e impostos:
1. Receipt & Expense Center
2. Reimbursements
3. Client Receipts & Payments
4. Smart Estimate Assistant
5. Tax Center
6. Notifications & Reports

## 11. Riscos e dúvidas abertas
- **Complexidade do Ledger de Reembolsos**: Separar pagamentos feitos em cartão pessoal para benefício da empresa exige um bom design de double-entry. Em vez de tabelas muito complexas, derivar a dívida a partir da tabela `receipts` (`reimbursement_status` + `paid_by_user`) pode ser o caminho do MVP.
- **Privacidade de Recibos**: A modelagem do RLS do Storage será crítica para evitar que uma empresa acesse extratos bancários de outra.

---

A Fase 6.0 reorganizou o HomeLeadPro como sistema operacional da empresa com Smart Estimate Assistant, Receipts, Reimbursements, Client Receipts, Payments, Tax Center, Notifications e Reports sem aplicar SQL automaticamente.
