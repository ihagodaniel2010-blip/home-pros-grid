# Resumo da Revisão (v2) - Fase 6.1: Receipt & Expense Center

Este relatório documenta a arquitetura revisada para o Receipt & Expense Center, agora com melhor separação entre o armazenamento de arquivos (Storage/Tabelas privadas) e segregação de métodos e origens de pagamentos.

## 1. Quais colunas reais existem hoje em receipts?
Na versão original da Fase 5 (após a modelagem padrão do `003_v7`), a tabela `receipts` contava com: `id`, `organization_id`, `service_job_id` (como NOT NULL), `estimate_id`, `amount`, `vendor`, `receipt_date`, `paid_by_user_id`, `payment_source`, `reimbursement_status`, `is_material_included`, `should_split_with_partners`, `notes`, `created_at` e `updated_at`.

## 2. Quais colunas serão adicionadas?
Além da remoção da trava de obrigatoriedade do `service_job_id`, novas colunas serão incluídas para expandir o escopo:
- `related_lead_id`: Referência para despesas atreladas a aquisição de leads.
- `expense_category`: Onde a despesa entra na contabilidade (`company_expense`, `job_material`, etc).
- `payment_method`: A forma como foi pago (veja item 4).
- `paid_by_name`: Nome livre caso a pessoa que pagou não seja um usuário do sistema.
- `reimbursable_to_owner`: Flag rápida indicando dívida da empresa para com o dono.
- `bill_to_client`: Marca que essa despesa deve ser incluída no próximo invoice do cliente.
- `client_reimbursement_status`: Rastreia se o cliente já reembolsou a empresa.
- `tax_year` e `tax_category`: Preparação contábil para o Tax Center (Fase 6.5).
- `status`: Permite anular recebimentos (`voided`) sem apagar histórico do ledger.

## 3. Como arquivos privados serão tratados?
Recibos e documentos contábeis são estritamente sigilosos. A ideia original de anexar um `receipt_file_url` público na tabela foi descartada.
Em vez disso, propomos uma tabela inteiramente dedicada: **`receipt_files`**.
Essa tabela possui campos baseados no Storage do Supabase (`storage_bucket`, `storage_path`, `file_name`, `mime_type`, `file_size`). Os links finais expirarão rapidamente via assinaturas seguras geradas no Backend/Frontend, sem exposição acidental. O RLS dessa nova tabela garantirá isolamento total por `organization_id`.

## 4. Como payment_method e payment_source ficaram separados?
Foram criadas duas dimensões de informação (ambas com ENUM checks fortes):
- **`payment_method`**: A mecânica da transação (`card`, `cash`, `zelle`, `venmo`, `check`, `bank_transfer`, `other`).
- **`payment_source`**: De *qual caixa* o dinheiro saiu (`company_account`, `company_card`, `owner_personal`, `partner_personal`, `employee_personal`, `customer_paid_direct`, `other`).

## 5. Como paid_by_user_id e paid_by_name definem quem pagou?
O `payment_source` (ex: `owner_personal`) conta apenas *que tipo* de caixa pessoal foi usado. Para saber **quem**, o `paid_by_user_id` aponta para a tabela genérica de `auth.users` (identificando o Hugo ou o irmão). O campo `paid_by_name` atua como fallback (para registrar compras de esposas, prestadores terceirizados etc., sem criar usuários para eles). 

## 6. Como o worker será bloqueado?
Para garantir 100% de segurança nesse MVP (e evitar chamadas a funções que exijam mais tabelas complexas agora), a política (`POLICY`) RLS dos workers foi completamente removida desta rodada. 
Resultado (Segurança Defaut do PostgreSQL): Nenhum worker tem acesso de leitura (SELECT), escrita (INSERT), nem atualização (UPDATE) na tabela `receipts` nem na `receipt_files`.

## 7. Como o teste rollback valida RLS?
O arquivo de teste `012_test_receipts_expenses_center_rollback.sql` foi reescrito. Agora ele simula de forma idêntica as conexões via API do Supabase (utilizando JWT spoof). Ele roda:
- `SET LOCAL role = authenticated;`
- `SET LOCAL request.jwt.claim.sub = 'uuid-do-user';`
Com esse contexto injetado pelo Postgres, conseguimos comprovar que o Worker tenta dar `SELECT` e recebe count 0, enquanto o Owner consegue ler e inserir perfeitamente. Como sempre, as queries são revertidas (`ROLLBACK`) ao final, mantendo o banco intacto.

## 8. O SQL 012 está pronto para revisão?
Sim. O arquivo `012_homeleadpro_receipts_expenses_center.sql` já não possui `BEGIN/COMMIT`. Quando aprovado, deverá ser aplicado envelopando manualmente no SQL Editor:
```sql
BEGIN;
-- Colar o conteúdo do arquivo 012
COMMIT;
```
