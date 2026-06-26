# Plano de Segurança e RLS (Row Level Security) — HomeLeadPro (Versão 2)

> **Nota de nomenclatura e revisão:** o produto anteriormente chamado Barrigudo passa a ter o nome comercial HomeLeadPro. Esta versão 2 do plano de segurança e RLS remove políticas públicas abertas genéricas (`using(true)`) e consolida as RPCs `security definer` como o canal oficial de acesso de clientes finais sem login.

---

## 1. Diretriz Geral de Segurança

A segurança de dados no HomeLeadPro baseia-se em duas regras fundamentais:
1. **Nenhum cliente final sem login possui acesso de seleção direta (`SELECT`)** ou atualização nas tabelas sensíveis do banco de dados (`estimates`, `estimate_items`, `service_extras`, `service_files`, `lead_files`, `sms_threads`, `company_settings`).
2. **Todas as consultas e atualizações de clientes anônimos são mediadas por RPCs (Remote Procedure Calls) seguras** marcadas como `security definer` que exigem o `public_token` criptográfico como argumento obrigatório.

---

## 2. Matriz de Acesso Detalhada por Perfil

### 2.1. Super Admin
* **Acesso:** Total de leitura, inserção, atualização e deleção em todas as tabelas.
* **Validação:** Função helper `public.is_super_admin()`.

### 2.2. Owner (Dono da Organização)
* **Acesso:** Total aos dados da sua própria empresa (`organization_id`).
* **Privilégios Exclusivos:** É o único perfil que pode cadastrar ou alterar registros na tabela societária `company_partners` e configurar as chaves financeiras de recebimento em `company_settings`.

### 2.3. Admin (Gerente de Escritório)
* **Acesso:** CRM, faturamento de propostas, andamento de ordens de serviço.
* **Restrições:** Bloqueado de ler ou editar `company_partners` e de atualizar campos de participação societária.

### 2.4. Worker (Funcionário / Instalador de Campo)
* **Restrições Financeiras Estritas:**
  * Totalmente bloqueado de selecionar ou ler dados das tabelas: `receipts`, `company_partners`, `lead_pricing_rules`, `organization_credit_ledger`, `estimates`, `estimate_items` e `estimate_payments_manual`.
* **Restrição de Leads:**
  * Bloqueado de visualizar a tabela geral de leads. Não enxerga leads que não possuem uma ordem de serviço atribuída a ele.
* **Ocultação de Dados de Contato:**
  * O trabalhador em campo só visualiza o endereço completo e ZIP do cliente se a flag `address_released_to_worker` em `service_jobs` for `true` ou se ele possuir uma permissão ativa em `employee_assignments.can_view_address`. Caso contrário, os dados de endereço real e telefone real permanecem mascarados.

### 2.5. Cliente Final (Sem Login - Canal RPC Seguro)
* **Mecanismo:** O acesso é feito chamando as RPCs do banco de dados, que verificam o token e realizam validações no servidor.
* **Tabelas e RPCs Correspondentes:**
  * **Estimates:** Acesso via `get_public_estimate(token text)`. Itens associados via `get_public_estimate_items(token text)`. Arquivos marcados com visibilidade de cliente via `get_public_estimate_files(token text)`.
  * **Aprovação/Recusa:** Ações realizadas pelas RPCs `approve_public_estimate(token text)` e `reject_public_estimate(token text)`. Atualizações diretas na tabela `estimates` por anônimos são bloqueadas.
  * **Extras:** Detalhes via `get_public_service_extra(token text)`. Resposta via `respond_public_service_extra(token text, response text)`.
  * **Reviews:** Vitrine pública via `get_public_reviews()` (retorna apenas `is_hidden = false` e `public_approved = true`). Cadastro anônimo via `submit_public_review(...)` (insere com aprovação pendente).

### 2.6. Público Anônimo Geral (Formulário do Site)
* **Envio de Leads:** Anon possui permissão de `INSERT` na tabela `leads` sob a condição de que a coluna `source` seja gravada como `'public'` e `status` seja `'new'`. Não possui permissão de leitura, impedindo a extração de dados do CRM.
* **Envio de Arquivos:** Anon possui permissão de `INSERT` em `lead_files` contanto que o `lead_id` corresponda a um lead público recém-cadastrado.

---

## 3. Segurança Multi-Tenant de Leads

Para resolver a modelagem de distribuição de leads para múltiplas empresas concorrentes:
* O lead público reside na tabela `leads` com `organization_id` como `NULL`.
* Quando o sistema distribui o lead para uma empresa (processado por backend com service role usando a RPC `distribute_public_lead_to_matching_companies`), um registro de cobrança é gravado em `lead_distributions` para aquela organização.
* A RLS de leitura da tabela `leads` para empresas autenticadas verifica se o usuário autenticado é Owner/Admin da organização associada ao lead (lead manual) OU se existe uma distribuição registrada para a organização do usuário em `lead_distributions`.
* Isso impede que uma empresa acesse os dados de contato de leads públicos que não comprou.
