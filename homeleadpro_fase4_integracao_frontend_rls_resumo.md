# Relatório Fase 4 — Integração Frontend e Restrição Worker

> **Build:** ✅ Sucesso — `npm run build` completou sem erros após limpeza de cache `.next`.

---

## 1. Arquivos Alterados

| Arquivo | Tipo de alteração |
|---|---|
| [estimates.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/estimates.ts) | RPCs públicas para orçamento |
| [reviewsService.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/reviewsService.ts) | RPCs públicas para avaliações |
| [reviews.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/types/reviews.ts) | Campos `organizationId` e `leadId` adicionados à interface |
| [leads.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/leads.ts) | Mapeamento de status e remoção de filtro de `organization_id` |
| [AdminLayout.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/components/admin/AdminLayout.tsx) | Filtro de menus e proteção de rotas para worker |
| [Dashboard.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/Dashboard.tsx) | `WorkerDashboard` — painel operacional exclusivo |
| [company-settings.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/company-settings.ts) | `default_footer` removida do payload de gravação |
| [CompanySettings.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/CompanySettings.tsx) | Inicialização defensiva de campos nulos |

---

## 2. O que foi alterado em estimates.ts

### `getEstimateByToken`
Antes: fazia `select` direto na tabela `estimates` (bloqueado por RLS para anônimos).

Depois: usa três RPCs públicas em sequência:
```typescript
supabase.rpc('get_public_estimate', { p_token: token })
supabase.rpc('get_public_estimate_items', { p_token: token })
supabase.rpc('get_public_estimate_files', { p_token: token }) // com try/catch caso não exista
```

### `approveEstimate`
Recebe `token?` opcional. Se fornecido, chama:
```typescript
supabase.rpc('approve_public_estimate', { p_token: token })
```
Caso contrário, faz update direto (para admins autenticados).

### `rejectEstimate`
Igual ao `approveEstimate`, mas usa `reject_public_estimate`.

### Update de status `Viewed`
Removido/desabilitado para usuários anônimos. TODO adicionado para futura RPC `track_public_estimate_view`.

---

## 3. O que foi alterado em reviewsService.ts

### `getReviews`
Quando `includeHidden` não está ativo (padrão público), chama:
```typescript
supabase.rpc('get_public_reviews')
```
Filtragem por rating, sort e paginação é feita em memória no frontend após retorno da RPC.

Quando `includeHidden: true` (admin autenticado), usa query direta na tabela.

### `addReview`
- **Usuário logado:** insere diretamente na tabela `reviews` (com `user_id`).
- **Anônimo:** usa RPC pública:
```typescript
supabase.rpc('submit_public_review', {
  p_organization_id: orgId,
  p_user_name: ...,
  p_rating: ...,
  p_body: ...,
  p_lead_id: null
})
```
Não é mais necessário login para submeter avaliação.

---

## 4. O que foi alterado em leads.ts

### Mapeamento de status
Adicionadas duas funções de conversão:
- `mapFrontendStatusToDb`: converte `"New" → "new"`, `"Estimate Sent" → "distributed"`, `"Approved" → "converted"`, etc.
- `mapDbStatusToFrontend`: converta o inverso, de volta para o frontend.

Todas as operações de get, save e update agora normalizam o status em ambas as direções.

### Remoção do filtro de `organization_id`
A função `getLeadsSupabase` não filtra mais manualmente por `organization_id`. O RLS do Carpentry retorna automaticamente os leads aos quais o usuário tem acesso (leads próprios + leads distribuídos via `lead_distributions`).

### Status de inserção
Novos leads são inseridos com `status: "new"` (minúsculo), compatível com o CHECK constraint do banco.

---

## 5. O que foi alterado para restringir worker

### AdminLayout.tsx — Filtro de menus
Workers (`userRole === "worker"`) enxergam apenas dois itens na navegação lateral:
- **Dashboard** (`/admin`)
- **Leads/Inbox** (`/admin/inbox`)

Todos os demais itens (Financeiro, Estimates, Reviews, Analytics, Company, Settings) são ocultados.

### AdminLayout.tsx — Bloqueio de rotas por URL direta
`useEffect` monitora `location.pathname`. Se um worker tentar acessar uma rota fora de `/admin` ou `/admin/inbox`, é redirecionado automaticamente para `/admin` via `navigate("/admin", { replace: true })`.

### Dashboard.tsx — WorkerDashboard
Quando `userRole === "worker"`, o `Dashboard` renderiza o componente `WorkerDashboard` (linha 332) em vez do painel administrativo completo.

O `WorkerDashboard` exibe:
- Lista de `service_jobs` atribuídos ao worker (via RLS automática)
- Botões de ação: **Start Job** (`scheduled → in_progress`) e **Complete Job** (`in_progress → completed`)
- Checklists (`service_checklists` + `checklist_tasks`) com toggle de conclusão por tarefa
- Galeria de fotos do serviço (`service_files`) com upload de novas fotos
- Barra de progresso visual por checklist

O worker **não tem acesso** a nenhum dado financeiro, de crédito, ledger, estimates, dados de sócios ou configurações da empresa.

---

## 6. O que foi alterado em CompanySettings

### company-settings.ts
- `default_footer` marcada como `optional` (`default_footer?: string`) na interface.
- Na função `saveCompanySettings`, o campo é desestruturado e removido do payload antes do `upsert`:
```typescript
const { default_footer, ...cleanSettings } = settings;
```
Isso evita erro de coluna inexistente no banco Carpentry.

### CompanySettings.tsx
- Na carga de dados, o estado inicial do formulário usa `data.default_footer || ""` para evitar warning do React sobre input não controlado com valor `null`.

---

## 7. Resultado do npm run build

```
✓ Compiled successfully in 49s
✓ Generating static pages (3/3)

Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            997 B         103 kB
└ ƒ /[[...slug]]                         1.29 kB         104 kB
+ First Load JS shared by all             102 kB
```

**Status: ✅ Build bem-sucedido. Zero erros de compilação ou TypeScript.**

---

## 8. Como Testar Cada Usuário

> Use o **DevLoginSimulator** (canto inferior direito em desenvolvimento) ou o formulário de login em `/admin/login`.
> **Senha:** `654321`

### owner-a@homeleadpro.com
- Deve ver todos os itens do menu lateral.
- Dashboard mostra KPIs financeiros (Revenue, Outstanding, Pending, Approved).
- Deve ver leads da Empresa A (incluindo lead público distribuído).
- Não deve ver dados da Empresa B.

### owner-b@homeleadpro.com
- Mesmo que owner-a, mas isolado para dados da Empresa B.
- Não deve ver dados da Empresa A.

### admin-a@homeleadpro.com
- Menu completo igual ao owner-a.
- Acesso à gestão de leads, estimates e reviews da Empresa A.

### worker-a@homeleadpro.com
- **Menu lateral:** apenas **Dashboard** e **Leads**.
- **Dashboard:** painel "My Assigned Jobs" com o serviço seeded (`v_job_a`, `HomePros Empresa A`, status `scheduled`).
- Pode clicar em **"View Checklist & Media"** para expandir e ver as 2 tarefas do checklist seeded.
- Pode marcar tarefas como concluídas.
- Pode adicionar fotos ao serviço.
- Pode clicar em **"Start Job"** para mudar status para `in_progress`.
- Tentar acessar `/admin/company` ou `/admin/estimates` pela URL → redirecionado para `/admin`.

---

## 9. Problemas Pendentes

| # | Descrição | Impacto | Prioridade |
|---|---|---|---|
| 1 | `track_public_estimate_view` RPC não implementada | Visualizações do cliente não rastreadas | Baixo |
| 2 | `getStats()` em `reviewsService.ts` faz select direto em `reviews` (pode falhar para anônimos) | Stats podem retornar zero para visitantes | Médio |
| 3 | Worker pode ver **todos os leads** na página `/admin/inbox` (RLS filtra por organização, não por job atribuído) | Worker pode ver leads que não são seus | Médio |

---

## 10. Próximo Passo Recomendado

1. **Teste ponta-a-ponta completo** com os 4 usuários de teste.
2. **Corrigir `getStats()`** para usar RPC pública se anônimos precisarem ver médias.
3. **Filtrar Inbox por worker:** Na página `Inbox.tsx`, adicionar filtro para mostrar ao worker apenas leads vinculados aos seus `service_jobs`.
4. **Implementar `track_public_estimate_view`** no banco e chamar no frontend.

---

"A Fase 4 integrou o frontend ao Supabase Carpentry respeitando RLS, RPCs públicas e restrições de worker. Nenhuma migration ou seed foi reaplicado."
