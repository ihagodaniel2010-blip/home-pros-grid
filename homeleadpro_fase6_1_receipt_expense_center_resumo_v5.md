# Resumo da Limpeza Final (v5) - Fase 6.1.4: Receipt & Expense Center

Este documento certifica a recriação do zero de todos os scripts relacionados ao módulo Receipt & Expense Center, assegurando que as regras de modelagem estritas foram respeitadas e que todos os detritos de versões anteriores foram apagados.

## 1. O que foi removido da v4?
Garantimos a total ausência dos seguintes itens ao refazer o código:
- A duplicidade na tabela `receipt_files` (`file_size integer` e `file_size bigint`) foi eliminada. A tabela usa exclusivamente `file_size bigint`.
- Nenhum trecho solto ou comando SQL quebrado (como parâmetros de tabela soltos) existe no arquivo de teste.
- A exclusão permanente de `receipt_file_url`, `hugo_personal_card`, `brother_personal_card` e qualquer menção a `is_worker_assigned_to_job` ou políticas de "Worker".
- Os arquivos foram rigorosamente separados. O SQL de migração e o de teste não contêm resumos Markdown nem comentários de fases antigas.

## 2. Confirmação do Arquivo Principal (012)
O arquivo `012_homeleadpro_receipts_expenses_center.sql` está totalmente purificado:
- **NÃO contém `BEGIN;` nem `COMMIT;`.**
- Foi configurado para verificar se as funções essenciais (`is_super_admin`, `get_user_role_in_org`) existem antes de prosseguir.
- Modifica a tabela `receipts` removendo a trava de `service_job_id` e adicionando todos os campos financeiros exigidos.
- Separa com distinção clara o `payment_method` (como o valor foi transacionado) e `payment_source` (de qual caixa/pessoa o dinheiro saiu).
- Adiciona os devidos indexes e ativa o RLS exclusivamente para o escalão corporativo (`super_admin`, `owner` e `admin`), sem nenhuma policy que conceda privilégios ao `worker`.

## 3. Confirmação do Teste Rollback
O arquivo `012_test_receipts_expenses_center_rollback.sql` encapsula todas as simulações dentro de um escopo protegido (`BEGIN;` e `ROLLBACK;`).
- Simula a inserção de dados via JWT (simulando a vida real na API do Supabase).
- Prova cabalmente que um Owner consegue inserir despesas (com e sem Jobs atrelados) e subir arquivos atrelados à despesa.
- Prova cabalmente que um Worker está **totalmente bloqueado** nesta fase (qualquer tentativa de SELECT retorna contagem 0 e qualquer tentativa de INSERT falha agressivamente pelo banco).

## 4. Próximos Passos (Ação Manual)
A aplicação desse pacote de banco de dados deve seguir a ordem abaixo:

1. **Validação**: Rode primeiro o arquivo `012_test_receipts_expenses_center_rollback.sql` isoladamente no Supabase SQL Editor.
2. **Aplicação Real**: Após a mensagem de sucesso da validação, copie o código do arquivo principal `012_homeleadpro_receipts_expenses_center.sql` e execute-o dentro de um bloco transacional manual:
```sql
BEGIN;
-- Colar aqui o conteúdo do 012
COMMIT;
```
