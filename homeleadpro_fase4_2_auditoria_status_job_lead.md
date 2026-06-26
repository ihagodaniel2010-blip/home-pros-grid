# Fase 4.2 — Auditoria: Diferença entre Status de Lead e Status de Job

> **Build:** ⏳ Em progresso...

---

## 1. Por que o worker vê o status atualizado e o owner/admin não?

### Diagnóstico Raiz

**São dois sistemas de status completamente independentes, armazenados em tabelas diferentes:**

| Entidade | Tabela | Coluna | Quem atualiza | Quem lê |
|---|---|---|---|---|
| Lead (comercial) | `public.leads` | `status` | Owner/Admin (via Inbox/LeadDetail) | Inbox, LeadDetail, Dashboard |
| Job (operacional) | `public.service_jobs` | `status` | Worker (via WorkerDashboard) | **Só WorkerDashboard** |

**O worker clicou em "Start Job" / "Complete Job" → atualizou `service_jobs.status`.**
**O owner/admin abre o Inbox ou o Dashboard → lê apenas `leads.status`.**

Como `service_jobs.status` **nunca foi exibido** nas telas de owner/admin, eles simplesmente não viam nenhuma mudança — porque a mudança aconteceu em uma tabela diferente.

---

## 2. Análise Detalhada por Tela

### WorkerDashboard (`Dashboard.tsx` — componente `WorkerDashboard`)
- **Query:** `supabase.from("service_jobs").select(...)` com join em `leads`
- **`handleUpdateJobStatus`:** atualiza `service_jobs.status`, `started_at`, `completed_at`
- **Não toca:** `leads.status`, `estimates.status`
- **Exibição:** badge de `job.status` com cores (scheduled/in_progress/completed)

### Inbox.tsx (`AdminInbox`)
- **Query:** `getLeads()` → `supabase.from("leads").select("*")`
- **Exibe:** `lead.status` (New/Contacted/Estimate Sent/Approved/Closed)
- **`service_jobs`:** **não consultado em nenhum momento**
- **Badge de job:** **inexistente**

### Dashboard.tsx (`Dashboard` — para owner/admin)
- **Query:** `getLeads()` + `getEstimates()`
- **Tabela "Recent Leads":** exibe `lead.status` na coluna Status
- **`service_jobs`:** **não consultado** pelo admin dashboard
- **KPIs financeiros:** baseados em `estimates`, não em jobs

### LeadDetail.tsx
- **Query:** `getLeadById(id)` → `supabase.from("leads")`
- **`service_jobs`:** **não consultado** (antes desta fase)
- **Timeline:** mostra `lead.statusHistory` (histórico do status comercial)

---

## 3. Arquivos Verificados

| Arquivo | O que foi verificado |
|---|---|
| [Dashboard.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/Dashboard.tsx) | Queries admin (leads+estimates), WorkerDashboard (service_jobs), `handleUpdateJobStatus` |
| [Inbox.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/Inbox.tsx) | Query de leads, ausência de service_jobs |
| [LeadDetail.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/LeadDetail.tsx) | Query de lead, ausência de service_jobs (antes da correção) |

---

## 4. Arquivos Alterados

| Arquivo | O que foi alterado |
|---|---|
| [LeadDetail.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/LeadDetail.tsx) | Adicionado fetch de `service_jobs` + card visual no sidebar |

### O que foi adicionado em LeadDetail.tsx

1. **Novo import:** `supabase`, ícones `Wrench`, `UserCheck`
2. **Novo tipo:** `ServiceJob` com campos `id`, `status`, `scheduled_at`, `started_at`, `completed_at`, `assigned_worker_id`
3. **Novo estado:** `const [serviceJob, setServiceJob] = useState<ServiceJob | null>(null)`
4. **Novo `useEffect`:** consulta `service_jobs` com `.eq("lead_id", id).maybeSingle()` — não quebra se não houver job
5. **Novo card no sidebar:** aparece **apenas quando existe um job vinculado ao lead**:
   - Badge colorido do `job.status` (verde = completed, azul = in_progress, âmbar = scheduled)
   - Timestamps: Scheduled, Started, Completed (quando presentes)
   - ID do worker atribuído (primeiros 8 chars do UUID)
   - Nota explicativa: *"Job status is independent from lead status"*

---

## 5. Foi correção visual ou problema real de banco?

**É uma limitação de exibição no frontend — não há bug no banco.**

- O banco está correto: `service_jobs.status` foi atualizado pelo worker com sucesso.
- O RLS não bloqueia owner/admin de ler `service_jobs` da própria organização.
- O problema era que **nenhuma tela de owner/admin consultava `service_jobs`**.

Portanto: **correção 100% visual/frontend**, sem necessidade de migration.

---

## 6. Recomendação: Manter Lead.status separado de Job.status

**Recomendamos NÃO sincronizar automaticamente `leads.status` baseado em `service_jobs.status`.**

### Por quê manter separados:
| Motivo | Explicação |
|---|---|
| **Semânticas diferentes** | `leads.status` é comercial (pipeline de vendas). `service_jobs.status` é operacional (execução do serviço). |
| **Podem divergir intencionalmente** | Um lead pode estar "Approved" (comercialmente fechado) mas o job ainda estar "scheduled". |
| **Owner tem controle** | O owner decide quando mover o lead para "Closed" — não deve ser automático ao completar o job. |
| **Histórico limpo** | O `statusHistory` do lead deve refletir decisões comerciais, não operacionais. |

### Alternativa futura (opcional):
Se quiser automação, criar uma RPC `sync_job_status_to_lead` que o owner possa acionar manualmente, ou uma trigger condicional no banco com aprovação prévia.

---

## 7. Resultado do npm run build

```
✓ Compiled successfully in 50s  (clean build — cache .next limpo)
✓ Generating static pages (3/3)

Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            997 B         103 kB
└ ƒ /[[...slug]]                         1.29 kB         104 kB
+ First Load JS shared by all             102 kB
```

**Status: ✅ Build bem-sucedido. Zero erros de compilação ou TypeScript.**

> Nota: O build anterior falhou com `Cannot find module for page: /_not-found` — esse é um erro intermitente de cache do Next.js, não relacionado ao código alterado. A limpeza do `.next` resolveu.

---

## 8. Como testar após a correção

### Como o owner-a deve testar:
1. Logar como `owner-a@homeleadpro.com / 654321`
2. Ir para Inbox → clicar no lead vinculado ao job do worker-a
3. **Na sidebar direita**, um novo card **"Service Job"** deve aparecer com:
   - Badge `in progress` ou `completed` (dependendo do que o worker fez)
   - Timestamps de started_at e/ou completed_at (se o worker clicou nos botões)
   - ID do worker atribuído
4. O badge de status principal do lead (no topo) permanece `New`/`Contacted`/etc — **não muda automaticamente**
5. Owner pode alterar `lead.status` independentemente do job

### O card NÃO aparece se:
- O lead não tiver nenhum `service_job` vinculado
- O `assigned_worker_id` não existir ainda

---

## 9. Próximo passo recomendado

1. **Testar o card de Service Job** no LeadDetail após build.
2. **Decidir se quer sincronização automática** de status (proposta SQL ou trigger).
3. **Mostrar job status também no Inbox** (badge adicional na tabela de leads quando existir job vinculado) — isso requereria um segundo fetch ou um join na query de leads.
4. **Aprovar e aplicar** [005b_homeleadpro_worker_rls_restriction_proposal.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/005b_homeleadpro_worker_rls_restriction_proposal.sql) se quiser restringir RLS do worker no banco.

---

"A Fase 4.2 auditou a diferença entre status de lead e status de job sem alterar o banco automaticamente."
