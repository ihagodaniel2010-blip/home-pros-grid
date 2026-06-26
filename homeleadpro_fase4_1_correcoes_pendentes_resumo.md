# Relatório Fase 4.1 — Correções Pendentes de RLS, Worker e Public Tracking

> **Build:** ✅ Sucesso — `npm run build` compilou em **21.1s** sem erros.

---

## 1. Arquivos Alterados

| Arquivo | Tipo de alteração |
|---|---|
| [reviewsService.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/reviewsService.ts) | `getStats()` migrado para RPC pública |
| [Inbox.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/Inbox.tsx) | Guarda de role worker + redirect para WorkerDashboard |
| [AdminLayout.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/components/admin/AdminLayout.tsx) | Remoção do item "Leads" do menu do worker |
| [PublicView.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/PublicView.tsx) | TODO atualizado com referência ao arquivo SQL da Fase 5 |
| [005_homeleadpro_track_public_estimate_view_rpc.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/005_homeleadpro_track_public_estimate_view_rpc.sql) | **[PROPOSTA SQL — NÃO APLICADO]** RPC track_public_estimate_view |
| [005b_homeleadpro_worker_rls_restriction_proposal.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/005b_homeleadpro_worker_rls_restriction_proposal.sql) | **[PROPOSTA SQL — NÃO APLICADO]** RLS mais restritiva para worker |

---

## 2. Como getStats/reviews foi corrigido

### Problema
`getStats()` na classe `SupabaseReviewsService` fazia `select` direto em `public.reviews`. Usuários anônimos ou bloqueados por RLS recebiam zero resultados (ou erro), fazendo a barra de estatísticas públicas mostrar valores zerados.

### Solução
`getStats()` agora chama a RPC pública `get_public_reviews()`, que é uma função `SECURITY DEFINER` — ela bypassa o RLS e retorna apenas reviews com `is_hidden = false` e `public_approved = true`. Os ratings são computados em memória a partir do retorno da RPC.

```typescript
// Antes:
const { data } = await supabase.from("reviews").select("rating");

// Depois:
const { data } = await supabase.rpc('get_public_reviews');
// + cálculo de avg/distribution em memória
```

**Impacto:** Visitantes anônimos e workers agora veem stats corretas na página pública de avaliações.

---

## 3. Como o acesso do worker foi restringido

### 3.1 — AdminInbox.tsx (Inbox/Leads)

**Problema:** O worker podia acessar `/admin/inbox` e ver todos os leads comerciais da empresa. O componente não verificava o role do usuário.

**Solução:** Adicionado hook `useUser` ao topo do `AdminInbox`. Dois `useEffect` foram inseridos:
1. Se `userRole === "worker"` → `navigate("/admin", { replace: true })` imediatamente.
2. O fetch de leads (`getLeads()`) não é executado para workers (retorno antecipado por role guard).

```typescript
const userRole = user?.organization?.role;

useEffect(() => {
  if (userRole === "worker") {
    navigate("/admin", { replace: true }); // redirect to WorkerDashboard
  }
}, [userRole, navigate]);

useEffect(() => {
  if (userRole === "worker") return; // skip fetching
  getLeads().then(...);
}, [userRole]);
```

### 3.2 — AdminLayout.tsx (Menu lateral)

**Ajuste:** O item "Leads" (`/admin/inbox`) foi removido do menu lateral dos workers. Antes, workers viam o Dashboard e o Leads. Agora veem **apenas o Dashboard**.

```typescript
// Antes:
return navItems.filter(item => item.path === "/admin" || item.path === "/admin/inbox");

// Depois:
return navItems.filter(item => item.path === "/admin"); // só Dashboard
```

**Comportamento final para worker:**
- Menu lateral: somente **My Jobs** (Dashboard)
- `/admin/inbox` digitado diretamente: redireciona para `/admin`
- Qualquer outra rota (company, estimates, analytics...): redireciona para `/admin`

---

## 4. Proposta SQL para RLS adicional

**Arquivo criado:** [005b_homeleadpro_worker_rls_restriction_proposal.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/005b_homeleadpro_worker_rls_restriction_proposal.sql)

**Status:** ⚠️ **NÃO APLICADO** — apenas documentado para revisão.

O arquivo documenta:
- Proposta de policy para `leads`: worker vê apenas leads vinculados aos seus `service_jobs`.
- Proposta de bloqueio explícito de `estimates` para workers.
- Proposta de bloqueio de `organization_credit_ledger` e `estimate_payments` para workers.

**Por que não foi aplicado agora:**
- Precisaria de `BEGIN; ... ROLLBACK;` de validação no SQL Editor do Supabase primeiro.
- Há risco de conflito com policies existentes (nomes podem variar).
- Aprovação do usuário é obrigatória antes de qualquer mudança de RLS no banco.

---

## 5. Como track_public_estimate_view ficou tratado

**Arquivo de proposta criado:** [005_homeleadpro_track_public_estimate_view_rpc.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/005_homeleadpro_track_public_estimate_view_rpc.sql)

**Status:** ⚠️ **NÃO APLICADO** — apenas documentado para revisão.

No frontend (`PublicView.tsx`), o bloco de tracking continua comentado. O TODO foi atualizado para:
- Referenciar o arquivo SQL de proposta.
- Indicar o código exato que deve ser descomentado após a RPC ser criada no banco.
- Alertar que `updateEstimate()` direto é bloqueado por RLS para anônimos.

---

## 6. Resultado do npm run build

```
✓ Compiled successfully in 21.1s
✓ Generating static pages (3/3)

Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            997 B         103 kB
└ ƒ /[[...slug]]                         1.29 kB         104 kB
+ First Load JS shared by all             102 kB
```

**Status: ✅ Build bem-sucedido. Zero erros de compilação.**

---

## 7. Checklist para re-testar

### owner-a@homeleadpro.com (senha: 654321)
- [ ] Login bem-sucedido.
- [ ] Menu lateral completo (Dashboard, Leads, Estimates, Reviews, Analytics, Company, Settings).
- [ ] Inbox mostra leads da Empresa A.
- [ ] KPIs financeiros visíveis.
- [ ] Página de avaliações públicas mostra stats corretas.

### owner-b@homeleadpro.com (senha: 654321)
- [ ] Login bem-sucedido.
- [ ] Dados isolados da Empresa B (não vê leads da Empresa A).
- [ ] Mesma experiência que owner-a, mas para empresa B.

### admin-a@homeleadpro.com (senha: 654321)
- [ ] Login bem-sucedido.
- [ ] Menu completo como owner-a.
- [ ] Acesso a leads, estimates, reviews da Empresa A.

### worker-a@homeleadpro.com (senha: 654321)
- [ ] Login bem-sucedido.
- [ ] Menu lateral: **APENAS** "Dashboard" (My Jobs). ← *(antes via "Leads" também)*
- [ ] Dashboard: painel "My Assigned Jobs" com job seeded (status: scheduled).
- [ ] Checklist expandível com 2 tarefas do job.
- [ ] Botão "Start Job" funciona (muda para in_progress).
- [ ] Botão "Complete Job" funciona.
- [ ] Upload de foto funciona.
- [ ] Acessar `/admin/inbox` diretamente → redireciona para `/admin` imediatamente.
- [ ] Acessar `/admin/estimates` diretamente → redireciona para `/admin`.
- [ ] Acessar `/admin/company` diretamente → redireciona para `/admin`.
- [ ] **Stats de avaliações públicas** (em páginas públicas) mostram valores corretos. ← *correção do getStats()*

---

## 8. Pendências restantes

| # | Descrição | Prioridade | Ação necessária |
|---|---|---|---|
| 1 | **RLS adicional para worker no banco** | Médio | Revisar e aplicar `005b_homeleadpro_worker_rls_restriction_proposal.sql` com aprovação |
| 2 | **track_public_estimate_view RPC** | Baixo | Revisar e aplicar `005_homeleadpro_track_public_estimate_view_rpc.sql` com aprovação |
| 3 | **WorkerDashboard: links para LeadDetail** | Baixo | Worker pode clicar em detalhes do job — verificar se não expõe dados sensíveis |
| 4 | **SMS/Comentários** | Baixo | Worker ainda pode potencialmente acessar threads SMS — verificar RLS em `sms_threads` |

---

"A Fase 4.1 corrigiu os pendentes de reviews/stats, worker e tracking público sem reaplicar migration ou seed."
