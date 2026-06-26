# Relatório de Correção do Teste ROLLBACK (Fase 5.6.2)

1. **Auditoria de Colunas Obrigatórias (`organizations`)**: 
   Avaliando o schema consolidado, confirmou-se que a tabela `organizations` exige preenchimento válido ou possui regras estruturais atreladas a `slug` e `status` (NOT NULL, unique e/ou constraints de verificação).

2. **Correção do Insert (Empresa A/B)**:
   Em vez de inserir parcialmente, os comandos dentro do `009_test_services_tasks_auto_distribution_rollback.sql` foram integralmente corrigidos para:
   `insert into public.organizations (id, name, slug, status) values (..., '... Teste', 'empresa-...-teste-rollback', 'active');`

3. **Estratégia de Organizações Temporárias vs Existentes**:
   Optou-se por **manter a criação de organizações temporárias**, porém de forma restrita e perfeitamente aderente ao schema. Como este é um teste encapsulado por `ROLLBACK`, organizações descartáveis protegem as configurações reais de "Empresa A/B" da semente do banco contra contaminações, isolando 100% as variáveis da distribuição.

4. **Auditoria Geral de Inserts (Demais Tabelas)**:
   Todos os demais inserts do teste foram verificados para não violar o schema em vigor:
   - `company_service_areas`: Adicionado obrigatoriamente a coluna `mode = 'zip_list'` para Empresa A e B, prevenindo a quebra do *constraint NOT NULL*.
   - `organization_credit_ledger`: O parâmetro `transaction_type` foi alterado de `'deposit'` (valor inválido) para `'credit_added'` respeitando rigorosamente a CHECK constraint definida na tabela.

5. **Resultado Esperado do ROLLBACK**:
   O teste aplicará o novo banco, testará a transação do `submit_public_lead()`, acusará SUCESSO debitando apenas a Empresa A e reverterá integralmente a transação do começo ao fim, com zero detritos de schema ou dados mockados no banco.

---

“A Fase 5.6.2 corrigiu o teste ROLLBACK 009 para respeitar o schema real de organizations.”
