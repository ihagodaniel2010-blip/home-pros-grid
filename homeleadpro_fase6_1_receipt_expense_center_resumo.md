# Resumo da Preparação - Fase 6.1: Receipt & Expense Center

Este relatório documenta a auditoria e as definições para a transformação da tabela `receipts` na espinha dorsal financeira de despesas da organização.

## 1. Como está a tabela receipts hoje?
Atualmente, a tabela `receipts` está estritamente ligada ao módulo de Jobs. Ela contém as colunas `id`, `organization_id`, `service_job_id` (que é **NOT NULL**), `estimate_id`, `amount`, `vendor`, `receipt_date`, `paid_by_user_id`, `payment_source`, `reimbursement_status`, `is_material_included`, `should_split_with_partners`, `notes`, `created_at` e `updated_at`.

## 2. O que será alterado?
A alteração central é a flexibilização da tabela para suportar **despesas de empresa** (company expenses) que não estão vinculadas a nenhum Job específico. A tabela deixará de ser um mero "anexo" de um serviço e passará a atuar como o livro-caixa principal de saídas.

## 3. Quais colunas novas serão adicionadas?
- `related_lead_id` (uuid, nullable): Para atrelar despesas de aquisição.
- `expense_category` (text): Classifica a despesa (`company_expense`, `job_material`, etc).
- `payment_method` (text): Especifica o meio de pagamento exato (`hugo_personal_card`, `company_card`, etc).
- `paid_by_name` (text): Para registros não atrelados a um usuário do sistema.
- `reimbursable_to_owner` (boolean): Flag de controle financeiro societário.
- `bill_to_client` (boolean): Marca se a despesa deverá ser cobrada do cliente no Estimate final.
- `client_reimbursement_status` (text): Monitora se o cliente já pagou a despesa.
- `tax_year` (int) e `tax_category` (text): Organização contábil.
- `receipt_file_url` (text): Atalho direto para o arquivo armazenado.
- `status` (text): Suporte para soft deletes e anulamentos (`voided`).

## 4. Como `service_job_id` nullable será tratado?
A constraint restritiva atual será removida (`ALTER COLUMN service_job_id DROP NOT NULL`). Os registros existentes permanecerão inalterados. Na interface `/admin/expenses`, despesas com `service_job_id` vazio serão tratadas e filtradas como "Company Expenses".

## 5. Como será a RLS?
A tabela continuará sob estrito controle de segurança por Tenant (`organization_id`). Nenhuma linha poderá ser acessada ou inserida sem que pertença à organização logada.

## 6. Como o worker será bloqueado?
Trabalhadores de campo (`worker`) não possuem a permissão genérica de `SELECT` na tabela. A policy apenas autorizará `INSERT` condicional: um worker só poderá inserir despesas se o `service_job_id` estiver preenchido e ele for o designado para aquele job (permitindo o upload de notas fiscais de materiais comprados em rota). A leitura total fica bloqueada.

## 7. Como owner/admin acessam?
Owners e Admins terão permissão irrestrita (CRUD completo) sob a política `"Company managers can manage receipts"`, limitando-se unicamente ao escopo da sua `organization_id`.

## 8. Como arquivos/recibos serão anexados?
A nova coluna `receipt_file_url` facilitará a vinculação direta da URL do anexo sem a obrigatoriedade de registrar um metadado complexo na tabela `service_files`. Os arquivos em si serão subidos para o bucket do Supabase Storage, respeitando políticas baseadas na organização.

## 9. Como isso alimentará Reimbursements (Fase 6.2)?
Ao classificar a despesa com `payment_method = hugo_personal_card` e `expense_category = company_expense`, o sistema automaticamente saberá que existe uma dívida da empresa para com o Hugo. As colunas `reimbursable_to_owner` e `reimbursement_status` orquestrarão o acerto de contas.

## 10. Como isso alimentará Tax Center (Fase 6.5)?
As colunas `tax_year` e `tax_category` permitirão agrupar as saídas financeiras e emitir o pacote de despesas diretamente para a contabilidade ao final do ano, com todos os PDFs anexados disponíveis via query.

## 11. Resultado do npm run build
Não aplicável no momento. O frontend (UI de despesas) e a aplicação dos SQLs ainda não foram efetuados nesta etapa de arquitetura.

---

**Nota sobre a UI (Planejada para o Frontend):**
A rota `/admin/expenses` terá Cards de Resumo (Total mês, Devido ao Hugo, etc), listagem robusta com filtros detalhados e upload simples de imagens de recibos, transformando a usabilidade em algo ágil para o dia a dia da obra.
