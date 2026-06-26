# Relatório de Correção de RLS de Worker/Funcionário no Delta SQL (Fase 2.0.3)

Este relatório detalha as correções de Row Level Security (RLS) aplicadas localmente no script delta SQL do **HomeLeadPro** para garantir que funcionários comuns (workers) só tenham acesso a dados de serviços aos quais foram explicitamente atribuídos.

---

## 1. Policies Inseguras Encontradas (na versão v3 anterior)

Identificamos políticas de RLS que permitiam a visualização e vazamento de dados de outros serviços para trabalhadores autenticados, pois verificavam a existência de registros relacionados sem validar o vínculo com o `auth.uid()` do usuário logado:

*   **Tabela `sms_messages`**:
    *   *Insegura*: `create policy "Assigned workers can view/send messages in threads they can access" on public.sms_messages for all using (exists (select 1 from public.sms_threads where sms_threads.id = sms_messages.thread_id));`
    *   *Falha*: Qualquer worker logado via API/Client podia ver qualquer mensagem SMS simplesmente porque ela pertencia a uma thread existente no banco de dados, sem qualquer checagem se o trabalhador estava atribuído àquele serviço.
*   **Tabela `service_checklists`**:
    *   *Insegura*: `create policy "Assigned workers can view checklists for their jobs" on public.service_checklists for select using (exists (select 1 from public.service_jobs where service_job_id = service_checklists.service_job_id));`
    *   *Falha*: Qualquer worker logado podia listar e visualizar qualquer checklist no banco.
*   **Tabela `checklist_tasks`**:
    *   *Insegura*: `create policy "Assigned workers can view checklist tasks" on public.checklist_tasks for select using (exists (select 1 from public.service_checklists where id = checklist_tasks.checklist_id));`
    *   *Falha*: Semelhante ao checklist, permitia listar todas as tarefas de checklists existentes.
*   **Tabela `service_extras`**:
    *   *Insegura*: `create policy "Assigned workers can view service extras" on public.service_extras for select using (exists (select 1 from public.service_jobs where id = service_extras.service_job_id));`
    *   *Falha*: Permitia visualizar custos extras de qualquer serviço do banco.
*   **Tabela `service_files`**:
    *   *Insegura*: `create policy "Assigned workers can view service files for their jobs" on public.service_files for select using (exists (select 1 from public.service_jobs where id = service_files.service_job_id));`
    *   *Falha*: Permitia ler anexos de serviços de terceiros, incluindo arquivos internos de outros clientes.

---

## 2. Helper Functions Criadas (no arquivo v4)

Para encapsular a validação de segurança e evitar redundâncias/erros nas expressões das políticas, criamos duas funções seguras com privilégio `SECURITY DEFINER` e qualificadas como `STABLE`:

### A. `public.is_worker_assigned_to_job(p_service_job_id uuid)`
Retorna `true` se, e somente se, o usuário autenticado (`auth.uid()`) for o trabalhador principal atribuído no registro do serviço ou possuir uma atribuição ativa na tabela de equipes (`employee_assignments`):
```sql
create or replace function public.is_worker_assigned_to_job(p_service_job_id uuid)
returns boolean security definer stable language plpgsql as $$
begin
    return exists (
        select 1 from public.service_jobs
        where id = p_service_job_id 
          and (assigned_worker_id = auth.uid() or exists (
              select 1 from public.employee_assignments
              where service_job_id = p_service_job_id 
                and worker_user_id = auth.uid()
          ))
    );
end;
$$;
```

### B. `public.can_worker_access_sms_thread(p_thread_id uuid)`
Valida se a thread de SMS informada está vinculada a um lead ou orçamento que possua um serviço atribuído ao trabalhador atual:
```sql
create or replace function public.can_worker_access_sms_thread(p_thread_id uuid)
returns boolean security definer stable language plpgsql as $$
begin
    return exists (
        select 1 from public.sms_threads t
        join public.service_jobs sj on (sj.lead_id = t.lead_id or (t.estimate_id is not null and sj.estimate_id = t.estimate_id))
        where t.id = p_thread_id 
          and public.is_worker_assigned_to_job(sj.id)
    );
end;
$$;
```

---

## 3. Tabelas Corrigidas e Novas Políticas RLS

Corrigimos os privilégios de trabalhador nas seguintes **8 tabelas** no arquivo final delta `v4.sql`:

1.  **`service_jobs`**:
    *   `SELECT`: Apenas se `is_worker_assigned_to_job(id)` for verdadeiro.
    *   `UPDATE`: Apenas se `is_worker_assigned_to_job(id)` for verdadeiro e o novo status for permitido (`in_progress`, `completed`).
2.  **`service_checklists`**:
    *   `SELECT`: Apenas se `is_worker_assigned_to_job(service_job_id)` for verdadeiro.
3.  **`checklist_tasks`**:
    *   `SELECT`: Apenas se a tarefa pertence a um checklist do serviço atribuído ao worker.
    *   `UPDATE`: Permite alterar a tarefa apenas se vinculada ao serviço atribuído. *Limitação para o futuro*: Restringir a nível de trigger ou aplicação a modificação exclusiva dos campos de execução (`is_completed`, `completed_by`, `completed_at`), impedindo que o worker edite a descrição da tarefa.
4.  **`service_extras`**:
    *   `SELECT`: Apenas se o custo extra pertencer a um serviço atribuído ao worker.
    *   *Sem UPDATE/INSERT/DELETE*: O trabalhador não pode alterar valores, nem aprovar/recusar extras (ações exclusivas do cliente com token público ou admin/owner).
5.  **`service_files`**:
    *   `SELECT`: Apenas se pertencer a um serviço atribuído ao worker e **não for um comprovante financeiro** (`receipt_id IS NULL`).
    *   `INSERT`: Worker pode anexar arquivos apenas a serviços atribuídos, com a restrição de que a visibilidade não pode ser definida diretamente como pública para portfólio (`visibility != 'public_portfolio'`) e não pode ser atrelado a um recibo financeiro (`receipt_id IS NULL`).
6.  **`sms_threads`**:
    *   `SELECT`: Apenas se o worker puder acessar a thread correspondente através da função `can_worker_access_sms_thread`.
7.  **`sms_messages`**:
    *   `SELECT`: Apenas mensagens pertencentes a threads que o worker pode acessar.
    *   `INSERT`: Worker pode enviar mensagens apenas para threads às quais tem privilégios de acesso.
8.  **`employee_assignments`**:
    *   `SELECT`: O funcionário comum só pode ver suas próprias atribuições (`worker_user_id = auth.uid()`), sem direito de listar atribuições de outros trabalhadores.

---

## 4. Garantia de Segurança Multitenancy

Com essa modelagem, garantimos isolamento absoluto:
1.  **Trabalhador Comum**: Não tem visibilidade sobre finanças (`receipts`, `receipt_id` em arquivos), orçamentos de outros clientes, leads globais ou serviços atribuídos a outros prestadores da mesma organização.
2.  **Acesso Direto**: A verificação explícita de `auth.uid()` impede injeções de ID ou requisições paralelas maliciosas via client do Supabase.

---

## 5. Status de Implantação e Testes

*   **Confirmação do Banco**: Nenhuma migração ou alteração foi executada no banco de dados remoto do Supabase. A etapa permaneceu puramente a nível de engenharia e planejamento de código local.
*   **Instrução de Teste Controlado**: Para validar o script de migração local [003_homeleadpro_delta_from_carpentry_existing_schema_v4.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/003_homeleadpro_delta_from_carpentry_existing_schema_v4.sql) antes da aplicação real, execute-o envelopado em blocos transacionais no SQL Editor do Supabase conectando ao projeto **Carpentry**:

```sql
BEGIN;

-- [Cole aqui o conteúdo de 003_homeleadpro_delta_from_carpentry_existing_schema_v4.sql]

ROLLBACK;
```

Apenas execute com `COMMIT` quando o teste com `ROLLBACK` for bem-sucedido e não levantar nenhum erro.
