# Guia de Execução Manual — Fase 2.1 — Aplicação do Delta no Supabase Carpentry (Versão v7)

Este documento guiará a aplicação manual e segura do schema delta corrigido (versão v7) no banco de dados do projeto **Carpentry** (`ozhjvprhhsdglxokfwze`) utilizando o **SQL Editor** do painel do Supabase.

---

## 🛑 IMPORTANTE ANTES DE INICIAR
1. **Confirmação do Projeto:** Certifique-se de que está conectado ao projeto **Carpentry** (`https://supabase.com/dashboard/project/ozhjvprhhsdglxokfwze`).
2. **Evitar Automatização:** Não utilize ferramentas automáticas ou MCP, pois eles ainda apontam para o projeto `ferreira-saas-v2`.
3. **Backup Visual:** Todas as tabelas existentes (`reviews`, `estimates`, `estimate_items`, `leads`, `clients`) estão atualmente com **0 registros**, garantindo que não há risco de perda de dados.
4. **Tabelas Fundamentais Defensivas (Fase 2.0.6):** A versão v7 inclui comandos `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` defensivos nas próprias tabelas fundamentais (`organizations`, `organization_users`, `company_settings`) logo após as suas declarações `CREATE TABLE IF NOT EXISTS`. Isso garante a presença de todas as colunas críticas (como `status`) caso a tabela já exista parcialmente no banco Carpentry, evitando falhas de referências posteriores nas helper functions, triggers e políticas RLS.

---

## 🚀 PASSO 1: Teste de Execução com ROLLBACK (Simulação Segura)

Antes de aplicar definitivamente as alterações, realize um teste de transação com rollback automático para garantir que toda a estrutura do script `003_homeleadpro_delta_from_carpentry_existing_schema_v7.sql` é compatível com o estado atual do banco Carpentry.

### Instruções:
1. Abra o arquivo local [003_homeleadpro_delta_from_carpentry_existing_schema_v7.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/003_homeleadpro_delta_from_carpentry_existing_schema_v7.sql).
2. Copie todo o conteúdo do arquivo.
3. Acesse o **SQL Editor** do Supabase no projeto **Carpentry**.
4. Crie uma nova query no editor e cole a seguinte estrutura:

```sql
BEGIN;

-- =========================================================================
-- COLOQUE TODO O CONTEÚDO DO ARQUIVO 003_homeleadpro_delta_from_carpentry_existing_schema_v7.sql AQUI
-- =========================================================================

ROLLBACK;
```

5. Clique em **Run** para executar.
6. Verifique o painel de resultados. A mensagem deve indicar que a query foi executada com sucesso e que a transação foi revertida (`ROLLBACK`). Se houver algum erro de sintaxe ou coluna ausente, o erro será exibido aqui e nada será alterado no banco real.

---

## 🚀 PASSO 2: Aplicação Real com COMMIT (Execução Definitiva)

**ATENÇÃO:** Só execute este passo após confirmar que o Passo 1 (ROLLBACK) executou com sucesso absoluto e sem nenhum erro.

### Instruções:
1. Limpe o SQL Editor do Supabase.
2. Monte a estrutura de commit conforme abaixo:

```sql
BEGIN;

-- =========================================================================
-- COLOQUE TODO O CONTEÚDO DO ARQUIVO 003_homeleadpro_delta_from_carpentry_existing_schema_v7.sql AQUI
-- =========================================================================

COMMIT;
```

3. Clique em **Run** para executar.
4. Ao final da execução, todas as novas tabelas, colunas, chaves estrangeiras, políticas RLS robustas e triggers estarão ativas de forma permanente no banco de dados **Carpentry**.

---

## 🛡️ Lista de Verificação Pós-Execução (RLS & Funções)

Após rodar o COMMIT, você pode rodar as seguintes consultas rápidas no editor SQL para garantir que a segurança de Worker está configurada:

### 1. Verificar Tabelas Fundamentais:
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_users');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings');
```

### 2. Verificar Colunas Críticas:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organization_users' AND column_name = 'status';
```

### 3. Verificar Helper Functions de Worker:
```sql
SELECT has_function_privilege('public.is_worker_assigned_to_job(uuid)', 'execute');
SELECT has_function_privilege('public.can_worker_access_sms_thread(uuid)', 'execute');
```

### 4. Listar as Policies da tabela `service_jobs`:
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'service_jobs';
```
*(Confirme que existe a policy: `"Assigned workers can view their service jobs"` e `"Assigned workers can update status of their jobs"`)*.

---
*Fim do Guia.*
