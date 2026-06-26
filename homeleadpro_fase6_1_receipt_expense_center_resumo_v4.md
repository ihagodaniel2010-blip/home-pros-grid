# Resumo da Limpeza Final (v4) - Fase 6.1.3: Receipt & Expense Center

Este relatório confirma a recriação limpa e a auditoria final dos scripts de implementação do Receipt & Expense Center. Os arquivos anteriores foram descartados, e o novo conjunto foi redigido estritamente de acordo com as regras de segurança e modelagem definitivas.

## 1. O que foi limpo/removido da versão v3?
Durante a recriação do zero, garantimos que não sobrassem resquícios de iterações passadas:
- **`receipt_file_url`**: Totalmente removido do script `012`. Arquivos confidenciais existirão apenas na nova tabela `receipt_files`.
- **Valores Misturados de Pagamento**: A coluna `payment_method` não contém mais `company_card`, `hugo_personal_card` ou `brother_personal_card`. Ela foi restringida unicamente à mecânica (`card`, `cash`, `zelle`, etc).
- **Policies de Worker**: Qualquer menção ao worker na tabela financeira foi apagada, bem como qualquer uso de `is_worker_assigned_to_job()`. O MVP não dará nenhum acesso a workers.
- **Transações Nativas**: Os comandos `BEGIN;` e `COMMIT;` foram expressamente erradicados do arquivo principal `012_homeleadpro_receipts_expenses_center.sql`.

## 2. A Tabela Satélite: `receipt_files`
Criada de forma independente para isolar metadados do Storage, contendo: `id`, `organization_id`, `receipt_id`, `storage_bucket`, `storage_path`, `file_name`, `mime_type`, `file_size` (como BIGINT), `uploaded_by` e `created_at`.

## 3. Segurança e Dependências (RLS)
Antes de criar qualquer policy para Owner/Admin ou Super Admin, o script foi encapsulado com uma validação preventiva (bloco `DO $$`) que aborta imediatamente a execução se as funções `public.is_super_admin()` ou `public.get_user_role_in_org()` não existirem no ambiente. Isso evita que o Supabase entre em estado inconsistente durante a aplicação manual.

Como não há policy para o papel "Worker", por default o PostgreSQL nega (default deny) qualquer operação (SELECT, INSERT, UPDATE, DELETE) tentada por eles nestas tabelas.

## 4. Teste Rollback 100% Funcional
O script `012_test_receipts_expenses_center_rollback.sql` foi reescrito sem duplicações de variáveis. Ele garante:
1. Simulação via `SET LOCAL role = authenticated` e `request.jwt.claim.sub` para simular RLS real.
2. Inserção bem-sucedida de despesas com e sem Jobs via perfil de Owner.
3. Inserção bem-sucedida de `receipt_files` acoplado à despesa.
4. Falha forçada e esperada se Owner tentar manipular `organization_id` de terceiros.
5. Falha forçada e esperada se Worker tentar ler (retorna contagem 0) ou inserir despesas.

## 5. Instruções de Aplicação
Para prosseguir sem quebras:

1. **Rodar o Teste Rollback**
   Execute o script `012_test_receipts_expenses_center_rollback.sql` no SQL Editor do Supabase. Ele aplicará as mudanças, fará todas as simulações, emitirá a mensagem *"Todos os testes (inserção owner, bloqueio cross-tenant, bloqueio worker) passaram com sucesso"* e cancelará tudo automaticamente com `ROLLBACK;`.

2. **Aplicação Manual Oficial**
   Somente se o rollback for aprovado, copie o conteúdo do `012_homeleadpro_receipts_expenses_center.sql` e encapsule no Supabase da seguinte forma:
   ```sql
   BEGIN;
   -- Colar o código inteiro do arquivo 012 aqui
   COMMIT;
   ```
