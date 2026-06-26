# Relatório Fase 2.0.2 — Correção de Compatibilidade de public_token no Delta SQL

Este relatório descreve o erro de compatibilidade de `public_token` encontrado durante o teste de rollback manual no Supabase **Carpentry** (`ozhjvprhhsdglxokfwze`) e as correções de compatibilidade aplicadas localmente.

---

## 1. Erro Encontrado no Teste com ROLLBACK

Durante a execução da Fase 2.1 utilizando a simulação segura (`BEGIN; ... ROLLBACK;`) no SQL Editor do Supabase, ocorreu o seguinte erro:

```
ERROR: 42703: column "public_token" does not exist
```

---

## 2. Causa Provável

O erro ocorreu porque o banco de dados Carpentry preexistente possui versões anteriores das tabelas `leads` e `estimates`, as quais foram criadas sem a coluna `public_token`. Como a nossa comparação por PostgREST assumiu a presença completa das colunas, o arquivo delta v2 não incluía a cláusula `ALTER TABLE` para criar a coluna `public_token` nessas tabelas antes que o banco a consultasse em gatilhos, índices e funções.

---

## 3. Tabelas Corrigidas e Colunas Adicionadas

Para garantir total compatibilidade estrutural, alteramos o delta para forçar a criação de todas as colunas necessárias às tabelas preexistentes que poderiam estar ausentes no banco Carpentry real.

As seguintes colunas foram adicionadas com instruções `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`:

* **Tabela `public.leads`:**
  * `public_token` (tipo `text`)
* **Tabela `public.estimates`:**
  * `public_token` (tipo `text`)
  * `project_type` (tipo `text`)
  * `notes` (tipo `text`)
  * `terms` (tipo `text`)
  * `valid_until` (tipo `timestamptz`)
  * `approved_at` (tipo `timestamptz`)
  * `rejected_at` (tipo `timestamptz`)
* **Tabela `public.service_extras`:**
  * `public_token` (tipo `text`)
  * `reason` (tipo `text`)
  * `approved_at` (tipo `timestamptz`)
  * `rejected_at` (tipo `timestamptz`)
* **Tabela `public.reviews`:**
  * `organization_id` (tipo `uuid`, FK para `organizations`)
  * `lead_id` (tipo `uuid`, FK para `leads`)
  * `service_job_id` (tipo `uuid`, FK para `service_jobs`)
  * `public_approved` (tipo `boolean` com default `false`)
  * `google_redirect_clicked` (tipo `boolean` com default `false`)
  * `customer_name` (tipo `text`)
  * `comment` (tipo `text`)
  * `user_id` alterada para `nullable` (`DROP NOT NULL`) para permitir envio anônimo.

---

## 4. Ordem Corrigida da Função e Inicialização de Tokens

1. **Definição Precoce da Função:** A função `public.generate_public_token()` foi movida para o início do script (Seção 1.2), logo após as criações e alterações de tabelas.
2. **Atualização Segura (Seção 1.3):** Foi adicionado um bloco de comandos `UPDATE` para popular retroativamente com tokens qualquer registro que possua a coluna `public_token` como nula ou vazia.
3. **Índices Únicos Filtrados (Seção 1.4):** Adicionada a criação de índices únicos filtrados `WHERE public_token IS NOT NULL` nas tabelas `leads`, `estimates` e `service_extras` para garantir a unicidade de tokens de forma segura e sem colisões com registros preexistentes em branco.

---

## 5. Arquivo v3 Criado

As correções foram consolidadas no novo arquivo local:
- [003_homeleadpro_delta_from_carpentry_existing_schema_v3.sql](file:///C:/Desenvolvimento/SiteIhago/Site/supabase/migrations/003_homeleadpro_delta_from_carpentry_existing_schema_v3.sql)

---

## 6. Instruções e Próximos Passos

1. **Testar novamente com ROLLBACK:** O usuário deve copiar o conteúdo do arquivo v3 e executar no editor SQL do Supabase Carpentry com o bloco de controle:
   ```sql
   BEGIN;
   -- [conteúdo do arquivo v3]
   ROLLBACK;
   ```
2. **Não aplicar COMMIT:** Nenhuma alteração real foi feita na base remota por parte deste agente. Só execute o `COMMIT` se a simulação com `ROLLBACK` for completada com 100% de sucesso e sem erros.

---

“Nenhuma migration foi aplicada. Esta etapa apenas corrigiu localmente o delta para compatibilidade de public_token antes de nova tentativa com ROLLBACK.”
