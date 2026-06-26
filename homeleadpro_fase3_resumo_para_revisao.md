# HomeLeadPro — Resumo para Revisão (Fase 3)

## 1. Confirmação de Criação de Usuários
* **NÃO criamos** usuários fictícios na tabela `auth.users` através do script SQL.
* O seed foi desenhado de forma 100% segura para respeitar a estrutura de autenticação oficial do Supabase Auth / GoTrue, evitando falhas de integridade em `auth.identities` e permitindo testes de fluxo de login real no frontend.

## 2. Instruções para Criação Manual de Usuários
Para rodar o seed, siga os passos abaixo:
1. Acesse o painel de administração do **Supabase** no projeto **Carpentry** (`ozhjvprhhsdglxokfwze`).
2. Acesse a seção **Authentication** -> **Users**.
3. Clique em **Add User** -> **Create User** para cada um dos 5 e-mails listados na seção abaixo.
4. Defina uma senha temporária (ex: `password123`).
5. Copie o **UUID** gerado para cada usuário criado.

## 3. Lista de E-mails de Teste Planejados
* `admin-global@homeleadpro.com` (Super Admin)
* `owner-a@homeleadpro.com` (Proprietário da Empresa A)
* `owner-b@homeleadpro.com` (Proprietário da Empresa B)
* `admin-a@homeleadpro.com` (Administrador da Empresa A)
* `worker-a@homeleadpro.com` (Funcionário da Empresa A)

## 4. Onde Substituir os UUIDs Reais no SQL
Abra o arquivo [004_homeleadpro_seed_test_data.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/004_homeleadpro_seed_test_data.sql) e substitua os UUIDs padrão nas linhas do bloco `DECLARE` (linhas 19 a 23):
```sql
    v_user_admin_global    uuid := 'SEU_UUID_ADMIN_GLOBAL'::uuid;
    v_user_owner_a         uuid := 'SEU_UUID_OWNER_A'::uuid;
    v_user_owner_b         uuid := 'SEU_UUID_OWNER_B'::uuid;
    v_user_admin_a         uuid := 'SEU_UUID_ADMIN_A'::uuid;
    v_user_worker_a        uuid := 'SEU_UUID_WORKER_A'::uuid;
```

## 5. Arquivo SQL de Seed Criado
* **Caminho**: [004_homeleadpro_seed_test_data.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/004_homeleadpro_seed_test_data.sql)
* Contém validação de integridade no início do bloco `DO $$` que impede a execução se os UUIDs fornecidos não forem encontrados no banco em `auth.users`, gerando um aviso claro ao desenvolvedor.

## 6. Próximo Passo: Teste Seguro com ROLLBACK
Antes de aplicar definitivamente o seed, execute uma simulação no SQL Editor do Supabase Carpentry:
```sql
BEGIN;

-- [Copie e cole todo o conteúdo atualizado de 004_homeleadpro_seed_test_data.sql]

ROLLBACK;
```
Confirme se a mensagem de sucesso ou erro de dependência é retornada sem falhas estruturais.

## 7. COMMIT Somente Após Aprovação
Após validar que a transação de rollback ocorreu com sucesso, e que todas as FKs e regras de banco foram satisfeitas, aplique permanentemente os dados rodando:
```sql
BEGIN;

-- [Copie e cole todo o conteúdo atualizado de 004_homeleadpro_seed_test_data.sql]

COMMIT;
```

## 8. Checklist de Testes RLS (Pós-Seed)
Após o COMMIT, valide a segurança rodando consultas SQL como os diferentes usuários de teste:
1. **Anonimato**: Consultar `estimates` diretamente deve retornar 0 linhas. Ler via `get_public_estimate('test-estimate-token-a123')` deve retornar o orçamento com sucesso.
2. **Isolamento de Tenants**: O `owner-a` consegue consultar `leads` e ver apenas leads da Empresa A (manual e o público distribuído). Não deve enxergar nenhum lead da Empresa B.
3. **Isolamento de Workers**: O `worker-a` só enxerga o job `v_job_a` ao qual foi explicitamente associado em `service_jobs`. Não consegue visualizar a tabela `organization_credit_ledger` nem `receipts`.
4. **Cobradoras de Crédito**: A Empresa B possui saldo de créditos baixo ($5.00). Tentar distribuir o lead de $30.00 para a Empresa B deve falhar no trigger do ledger de créditos.

## 9. Status do Banco Carpentry
* **Nenhum seed foi aplicado automaticamente**. O banco remoto Supabase Carpentry permanece intacto e com dados de autenticação limpos para que você crie os usuários manualmente antes.

---
*Fim do Relatório.*
