# Relatório Fase 2 — Aplicação Controlada do Banco de Desenvolvimento do HomeLeadPro (PAUSADO)

Este relatório formaliza a pausa de segurança na execução da **Fase 2 — Aplicação Controlada do Banco em Ambiente de Desenvolvimento** devido à detecção de conflitos de credenciais entre as configurações locais do projeto e as ferramentas MCP disponíveis.

---

## 1. Conflito de Projetos Supabase Detectado

Ao iniciarmos a Fase 2, executamos a varredura de segurança nas credenciais do Supabase. Identificamos uma divergência crítica entre o projeto configurado localmente no código e o projeto disponibilizado pelas credenciais do servidor MCP:

1. **Projeto no arquivo `.env` local:** `ozhjvprhhsdglxokfwze` (aponta para `ozhjvprhhsdglxokfwze.supabase.co`).
2. **Projeto acessível via credenciais MCP:** `dembegkbdvlwkyhftwii` (referente ao projeto **`ferreira-saas-v2`** da organização *SistemasHugoDev Org*).

---

## 2. Por que a Execução foi Habilitada à Pausa (Risco Crítico)

O projeto `ferreira-saas-v2` (`dembegkbdvlwkyhftwii`) pertence a uma aplicação de terceiros totalmente distinta (CalhaFlow). Ele contém tabelas ativas e com dados povoados (ex: `companies` com 62 linhas, `profiles` com 69 linhas, `estimates` com 405 linhas).

Se tivéssemos prosseguido com a aplicação dos scripts SQL do HomeLeadPro v2 nesse ambiente:
* Poderíamos causar colisões de nomes de tabelas (como `estimates`, `estimate_items`, `receipts` e `audit_logs`).
* Ocorreriam alterações indesejadas de RLS e triggers de banco em tabelas de produção/teste ativas de outro sistema.
* Haveria corrupção e misturas de dados críticos.

Por questões de **segurança e governança de dados**, a execução foi imediatamente suspensa e nenhuma instrução DDL ou DML foi enviada a esse banco de dados.

---

## 3. Credenciais Necessárias para Retomada

Para retomar a Fase 2 de forma segura, o ambiente do Supabase precisará ser configurado para apontar para o banco correto e isolado de desenvolvimento do HomeLeadPro. As seguintes variáveis de ambiente precisam ser sincronizadas:

### 3.1. Configurações locais do `.env`
* `NEXT_PUBLIC_SUPABASE_URL` / `VITE_SUPABASE_URL` / `SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY` (Chave de backend com privilégios de bypass de RLS para execução de rotas administrativas).

### 3.2. Configuração do Servidor MCP Supabase
* A chave de acesso da API do Supabase (Supabase Personal Access Token) configurada no arquivo de configuração do MCP do IDE do desenvolvedor deve pertencer a uma conta que tenha privilégios de acesso ao projeto de testes correto do **HomeLeadPro**.

---

## 4. Confirmação de Integridade

* **Estado do Banco de Dados Remoto (`ferreira-saas-v2`):** Totalmente intocado. Nenhuma tabela, trigger, função, bucket ou dado foi inserido, alterado ou excluído.
* **Estado do Código Local:** Integro. O build com `npm run build` continua íntegro e passando normalmente.

---

“Nenhuma alteração foi aplicada. A Fase 2 foi pausada por conflito de projeto Supabase.”
