# Resumo da Revisão (v3) - Fase 6.1.2: Receipt & Expense Center

Este relatório consolida a versão final (limpa e segura) da modelagem de banco de dados para a implementação do módulo financeiro Receipt & Expense Center.

## 1. O que foi ajustado na Tabela `receipts`?
- **Remoção de Obrigatoriedade**: A coluna `service_job_id` teve o seu bloqueio de `NOT NULL` removido (`ALTER COLUMN service_job_id DROP NOT NULL`), viabilizando o registro de despesas gerais da empresa.
- **Novas Colunas (Dimensão de Negócios)**:
  - `related_lead_id`
  - `expense_category`
  - `paid_by_name`
  - `reimbursable_to_owner`
  - `bill_to_client`
  - `client_reimbursement_status`
  - `tax_year`
  - `tax_category`
  - `status`
- **Separação de Meios de Pagamento**: Ocorreu a clara divisão entre o *método* (como foi pago) e a *origem* (de que conta/cartão saiu):
  - **`payment_method`**: Limitado puramente à natureza da transação (`card`, `cash`, `zelle`, `venmo`, `check`, `bank_transfer`, `other`).
  - **`payment_source`**: Limitado estritamente à entidade de origem (`company_account`, `company_card`, `owner_personal`, `partner_personal`, `employee_personal`, `customer_paid_direct`, `other`).
- **Nenhum Campo Público de Arquivo**: A coluna `receipt_file_url` (presente em rascunhos anteriores) foi **completamente removida** por questões de privacidade.

## 2. A Nova Tabela: `receipt_files`
Para garantir isolamento, gestão rigorosa do Storage do Supabase e evitar poluição da tabela financeira central, criamos uma tabela satélite exclusivamente para metadados de arquivos privados:
- Campos: `id`, `organization_id`, `receipt_id`, `storage_bucket`, `storage_path`, `file_name`, `mime_type`, `file_size`, `uploaded_by`, `created_at`.
- Ao utilizar RLS próprio para essa tabela, assegura-se que nenhum usuário não autorizado consiga sequer obter o path dos comprovantes das empresas.

## 3. Segurança e RLS (Row Level Security)
- **Nível Administrativo**: Owners e Admins (daquela respectiva `organization_id`) detêm permissões totais de leitura e escrita. Super Admins possuem visão completa para fins de manutenção.
- **Workers Totalmente Bloqueados**: Neste MVP (Fase 6.1), qualquer policy envolvendo `is_worker_assigned_to_job` foi descartada. Trabalhadores não possuem capacidade de `SELECT`, `INSERT`, `UPDATE` ou `DELETE` no ambiente financeiro. O banco de dados PostgreSQL protegerá esses endpoints por default (`default deny`).
- Todas as funções de auxílio (`public.is_super_admin`, `public.get_user_role_in_org`) já existem e estão plenamente testadas.

## 4. Teste Rollback Refatorado
O arquivo `012_test_receipts_expenses_center_rollback.sql` foi reconstruído sem misturar dados antigos e garantindo a simulação completa do contexto JWT do Supabase API. Ele prova que:
- O Owner consegue registrar saídas sem atrelamento a Jobs.
- O Owner consegue registrar comprovantes anexados sem vazamento para outros tenants.
- O Worker sofre exceção caso tente ler ou interagir com o balanço de caixa da companhia.

## 5. Próximos Passos (Manual)
O SQL central (`012_homeleadpro_receipts_expenses_center.sql`) está perfeitamente limpo, **sem as instruções `BEGIN` e `COMMIT`**. 
Para efetivação no ambiente remoto, o administrador executará no console oficial:
```sql
BEGIN;
-- Colar o conteúdo do arquivo 012 limpo
COMMIT;
```
