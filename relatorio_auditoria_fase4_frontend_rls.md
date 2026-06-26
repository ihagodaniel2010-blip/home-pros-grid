# Relatório de Auditoria Técnica — Fase 4: Integração Frontend e RLS por Login Real

Este relatório apresenta o diagnóstico completo dos arquivos do frontend que interagem com o Supabase Carpentry (`ozhjvprhhsdglxokfwze`), mapeando as adaptações obrigatórias para que a integração respeite as políticas RLS, constraints e RPCs implantadas nas fases anteriores.

---

## 1. Mapeamento de Arquivos e Diagnóstico

### A. Faturamento e Orçamentos (`src/lib/estimates.ts`)

*   **Busca por Token Pública (`getEstimateByToken`):**
    *   *Código Atual:* Faz um `.select('*, items:estimate_items(*)')` direto na tabela `estimates` onde `public_token` coincide.
    *   *Incompatibilidade RLS:* Sob a política RLS restrita, clientes anônimos recebem `0` linhas nesta tabela.
    *   *Ajuste:* Deve ser reescrita para invocar o RPC `supabase.rpc('get_public_estimate', { p_token: token })`, além de chamar as RPCs auxiliares `get_public_estimate_items` e `get_public_estimate_files`.
*   **Aprovação de Faturas (`approveEstimate`):**
    *   *Código Atual:* Atualiza a tabela `estimates` definindo `status = 'Approved'` diretamente no cliente.
    *   *Incompatibilidade RLS:* Usuários não autenticados (clientes visualizando a página pública) não têm permissões de escrita/update nas tabelas por RLS.
    *   *Ajuste:* Deve ser reescrita para chamar a RPC `supabase.rpc('approve_public_estimate', { p_token: token })`.
*   **Recálculo de Totais no Frontend:**
    *   *Código Atual:* O frontend realiza lógicas manuais pós-pagamento em `createPayment` para recalcular o `balance_due` e atualizar `estimates`.
    *   *Incompatibilidade RLS:* O banco Carpentry possui agora triggers específicos (`trg_recalculate_totals` e `trg_item_total_price`) que recalculam subtotal, impostos e saldos em nível de servidor. Atualizações diretas dos totais pelo frontend podem colidir ou ser barradas.
    *   *Ajuste:* Simplificar essas chamadas confiando nos triggers do banco e recarregar os dados recalculados a partir da resposta.

---

### B. Gestão de Depoimentos e Avaliações (`src/lib/reviewsService.ts`)

*   **Leitura de Reviews Públicas (`getReviews`):**
    *   *Código Atual:* Executa select com filtros na tabela `reviews` diretamente.
    *   *Incompatibilidade RLS:* A RLS limita a visualização pública estritamente para `is_hidden = false` e `public_approved = true`. O código funciona, mas deve ser simplificado.
    *   *Ajuste:* Pode ser adaptado para utilizar a RPC pública `get_public_reviews()` que encapsula essa regra de negócio e otimiza o carregamento de reviews públicas.
*   **Submissão de Reviews Públicas (`addReview`):**
    *   *Código Atual:* Exige que o usuário esteja logado via `supabase.auth.getUser()`.
    *   *Incompatibilidade de Fluxo:* Clientes que chegam via link de email para avaliar um serviço finalizado não possuem login no painel administrativo do sistema.
    *   *Ajuste:* Mudar para que, caso o usuário não esteja logado, envie o review anonimamente chamando a RPC `submit_public_review(organization_id, user_name, rating, body, lead_id)`.

---

### C. Gestão de Leads (`src/lib/leads.ts`)

*   **Incompatibilidade Crítica de Casing no Status:**
    *   *Código Atual:* A função `saveLeadSupabase` insere novos leads com `status = 'New'` (com N maiúsculo).
    *   *Incompatibilidade de Banco:* O banco Carpentry real possui uma check constraint `check (status in ('new', 'distributed', 'contacted', 'converted', 'lost', 'rejected', 'closed'))` que exige status estritamente em minúsculas. Inserir `'New'` causará falha imediata na transação.
    *   *Ajuste:* Realizar o mapeamento de casing (`lowercase` ao enviar para o banco, `PascalCase` ao mapear para a interface de tipagem do frontend).
*   **Busca de Leads da Organização (`getLeadsSupabase`):**
    *   *Código Atual:* Se `organizationId` for fornecido, executa query `.eq('organization_id', organizationId)`.
    *   *Incompatibilidade Multiempresa:* Leads distribuídos pela plataforma possuem `organization_id = NULL` (pois são compartilhados por até 3 empresas) e estão vinculados na tabela `lead_distributions`. Se filtrarmos estritamente por `organization_id = organizationId`, a empresa **não verá** nenhum dos leads públicos que comprou, vendo apenas seus leads manuais.
    *   *Ajuste:* Ajustar a query para consultar todos os leads. A própria política RLS do banco Carpentry filtrará os leads automaticamente, retornando apenas os manuais da empresa + os públicos que ela tem distribuição.

---

### D. Autenticação, Contexto e Usuário (`src/context/UserContext.tsx` & `src/lib/admin-auth.ts`)

*   **Estrutura de Roles no Frontend vs Banco:**
    *   *Código Atual:* A interface `Organization` define `role` como `'owner' | 'admin' | 'staff'`.
    *   *Incompatibilidade de Schema:* A base do Carpentry aceita roles do tipo `super_admin`, `owner`, `admin`, `worker`, e `staff`. Se um Worker logar, o mapeamento de roles falhará na tipagem ou limitará seu acesso indevidamente.
    *   *Ajuste:* Adicionar os papéis `'super_admin'` e `'worker'` nas tipagens de roles de organizações do frontend.
*   **Mapeamento de Sessão e Organizações (`fetchUserOrganizations`):**
    *   *Código Atual:* Realiza a junção entre `organization_users` e `organizations` para listar as empresas do usuário logado.
    *   *Ajuste:* Manter a lógica de associação, mas garantir que o `status = 'active'` do usuário na organização seja validado, prevenindo que usuários demitidos/inativos carreguem a empresa.

---

### E. Painéis Administrativos e Dashboard (`src/pages-spa/admin/`)

*   **Dashboard Geral (`Dashboard.tsx`):**
    *   *Código Atual:* Utiliza `getLeads(user.organization.id)` e `getEstimates()`.
    *   *Ajuste:* Certificar de que `getEstimates` também receba filtros de `organization_id` ou dependa exclusivamente da RLS do banco de dados para isolamento entre a Empresa A e a Empresa B.
*   **Configurações da Empresa (`CompanySettings.tsx` & `src/lib/company-settings.ts`):**
    *   *Código Atual:* Lê e edita `default_footer` na tabela `company_settings`.
    *   *Incompatibilidade de Banco:* A tabela `public.company_settings` criada no delta Carpentry **não possui** o campo `default_footer` (apenas `default_terms` e metadados). Chamar o update com esta coluna resultará em erro.
    *   *Ajuste:* Remover a coluna `default_footer` das queries de escrita e leitura no frontend ou planejar uma futura migração para adicioná-la no banco de dados remoto.
*   **Páginas Públicas (`PublicView.tsx`):**
    *   *Código Atual:* Executa lógica direta de auto-visualização: `updateEstimate(data.id, { status: 'Viewed' })` ao carregar a página com status `'Sent'`.
    *   *Incompatibilidade RLS:* Clientes anônimos não podem atualizar a tabela diretamente.
    *   *Ajuste:* Criar um endpoint RPC no backend ou desabilitar essa ação direta do frontend de faturamento para evitar erros de permissão por RLS.

---

## 2. Conclusões e Recomendações
O frontend atual necessita de ajustes pontuais, mas cruciais, nos arquivos de biblioteca de integração do Supabase (`estimates.ts`, `reviewsService.ts`, `leads.ts`) e no contexto de sessão (`UserContext.tsx`). A maior parte da complexidade de segurança e multiempresa já foi abstraída a nível de banco de dados (RLS e RPCs), restando ao frontend invocar os métodos corretos e mapear o casing das constraints.

**Nenhuma alteração no código frontend foi realizada.** Esta auditoria guiará as implementações da Fase 4.
