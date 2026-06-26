# Relatório de Correção das Tabelas Fundamentais Multiempresa (Fase 2.0.4)

Este relatório descreve as correções de estrutura e ordem realizadas no script delta SQL do **HomeLeadPro** para garantir que as tabelas base multiempresa existam antes de qualquer criação ou política dependente.

---

## 1. Problema Encontrado no Delta v4
Na versão `v4` do delta SQL, várias tabelas novas (tais como `company_services`, `company_service_areas`, `lead_distributions`, `sms_threads`, etc.) e políticas RLS foram criadas com chaves estrangeiras (`foreign key`) e referências para a tabela `public.organizations(id)`. 

Contudo, as tabelas fundamentais de tenanting multiempresa (`organizations`, `organization_users`, e `company_settings`) **não eram criadas em nenhuma parte do delta**. Como o banco Carpentry original possui apenas as tabelas `reviews`, `estimates`, `estimate_items`, `leads` e `clients`, a tentativa de execução do delta `v4` falharia imediatamente por erro de relacionamento de chave estrangeira inexistente.

---

## 2. Tabelas Fundamentais Adicionadas no Início do Script
Adicionamos as seguintes tabelas ao início do script delta `v5.sql` (logo após a habilitação da extensão `pgcrypto`):

*   **`public.organizations`**: Representa a entidade da empresa (tenant) com campos de identificação, slug único, controle de status (`active`, `inactive`, `suspended`) e flag de proprietário da plataforma.
*   **`public.organization_users`**: Tabela de associação N:N entre organizações e usuários do auth do Supabase (`auth.users`), controlando os papéis (`super_admin`, `owner`, `admin`, `worker`) e status do vínculo.
*   **`public.company_settings`**: Armazena as configurações de cada empresa (nome, logotipo, contatos, impostos padrão, termos de uso, templates de mensagens, etc.), tendo `organization_id` como chave primária e estrangeira.

---

## 3. Ordem Corrigida do Delta SQL v5
O script delta versão `v5` foi estruturado na seguinte ordem lógica para evitar conflitos de dependência de banco:

1.  **Extensões**: Habilitação de `pgcrypto`.
2.  **Tabelas Fundamentais**: Criação de `organizations`, `organization_users` e `company_settings`.
3.  **Tabelas de Referência**: Criação de tabelas secundárias como `service_categories` e `us_locations`.
4.  **Tabelas Dependentes**: Criação das tabelas de serviço, extras, arquivos, recibos, sócios e distribuições.
5.  **ALTER TABLE Defensivos**: Inserção de colunas e foreign keys nas tabelas pré-existentes (`leads`, `estimates`, `estimate_items`, `reviews`).
6.  **Gerador de Tokens**: Criação da função `generate_public_token` e atualização das linhas de dados legados com tokens seguros.
7.  **Indexação e FKs Cruzadas**: Criação de índices de busca rápidos e inserção de FKs cruzadas remanescentes (ex. `sms_threads` -> `estimates`).
8.  **Habilitação de RLS**: Ativação do Row Level Security para todas as 27 tabelas do projeto.
9.  **RLS Helper Functions**: Funções estáveis para verificar papéis, associação de workers e acesso a threads SMS.
10. **RLS Policies**: Criação de políticas de isolamento robustas.
11. **Funções e Triggers**: Recalculador de totais, auditoria, validação societária e sincronismo de `updated_at`.
12. **RPCs Públicos e Sistemas**: Criação de funções de segurança definer (acesso de cliente via token e motor de distribuição).

---

## 4. ALTER TABLE Defensivos e Colunas Críticas Garantidas
Para evitar erros de colunas ausentes no banco Carpentry, adicionamos comandos `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` com tratamento defensivo:

### A. Tabelas Pré-existentes com `organization_id`
*   `leads` -> `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;`
*   `estimates` -> `ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;`
*   `estimate_items` -> `ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;` *(Nota: Esta coluna é nullable para retrocompatibilidade inicial com registros preexistentes)*.
*   `reviews` -> `ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;`

### B. Outras Colunas Críticas Garantidas para RLS e RPCs
*   `leads`: `source`, `status`, `service_category_id`, `urgency`, `zip`, `public_token`.
*   `estimates`: `status`, `public_token`, `project_type`, `notes`, `terms`, `valid_until`, `approved_at`, `rejected_at`.
*   `reviews`: `user_name`, `body`, `public_approved`, `google_redirect_clicked`, `customer_name`, `comment`, `is_hidden`, `lead_id`, `service_job_id`.

---

## 5. Status de Implantação e Testes

*   **Confirmação do Banco**: Nenhuma migração ou alteração foi executada no banco de dados remoto do Supabase. A etapa permaneceu puramente a nível de engenharia e planejamento de código local.
*   **Instrução de Teste Controlado**: Para validar o script de migração local [003_homeleadpro_delta_from_carpentry_existing_schema_v5.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/003_homeleadpro_delta_from_carpentry_existing_schema_v5.sql) antes da aplicação real, execute-o envelopado em blocos transacionais no SQL Editor do Supabase conectando ao projeto **Carpentry**:

```sql
BEGIN;

-- [Cole aqui o conteúdo de 003_homeleadpro_delta_from_carpentry_existing_schema_v5.sql]

ROLLBACK;
```

Apenas execute com `COMMIT` quando o teste com `ROLLBACK` for bem-sucedido e não levantar nenhum erro.
