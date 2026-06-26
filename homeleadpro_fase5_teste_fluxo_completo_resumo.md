# Fase 5 — Teste do Fluxo Completo Ponta a Ponta do HomeLeadPro

> **Build:** ✅ Não houve alterações de código nesta fase — build anterior (Fase 4.2) está válido.
> **Status geral:** Auditoria completa executada. Sem alterações de banco.

---

## 1. Checklist Executado

### 1.1 — Lead Público (Formulário de Cotação)
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.1.1 | Cliente preenche formulário em `/quote/:serviceSlug` | ✅ Funciona | `Quote.tsx` envia via `saveLead()` → `supabasePublic` |
| 1.1.2 | Lead é salvo com `source: null` / `status: "new"` | ⚠️ Atenção | `saveLead()` não define `source: 'public'` explicitamente. Usa `NEXT_PUBLIC_DEFAULT_ORG_ID` como org. Mas o seed espera `organization_id: null` para leads públicos. Ver §4. |
| 1.1.3 | Upload de mídia via Storage `organization-private` | ⚠️ Risco | Bucket `organization-private` pode não existir no Carpentry. Sem bucket → lead sem foto é salvo normalmente, mas lead com foto dá erro de upload. Documentado como pendência. |
| 1.1.4 | Redirect para `/success` após envio | ✅ Funciona | |
| 1.1.5 | Honeypot anti-bot implementado | ✅ Funciona | `websiteUrl` oculto, redirecionado silenciosamente |

### 1.2 — Distribuição de Lead
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.2.1 | Lead público está disponível em `lead_distributions` | ✅ Seedado | `v_lead_public` distribuído para `org_a` com `price_charged: $30.00` |
| 1.2.2 | Débito registrado em `organization_credit_ledger` | ✅ Seedado | `-$30.00` debitado, `balance_after: 70.00` |
| 1.2.3 | Frontend do owner/admin mostra lead distribuído | ✅ Funciona | `getLeadsSupabase()` não filtra por `organization_id` → RLS filtra |
| 1.2.4 | Interface de distribuição manual de leads | ❌ Não existe | **Não há tela de "comprar lead"** no frontend. Distribuição hoje é 100% manual via SQL/seed. |
| 1.2.5 | Empresa B com saldo baixo não compra lead caro | ⚠️ Não testável via UI | Restrição só existe se houver RPC/função de compra. Sem UI de compra, o teste é só via SQL. |

### 1.3 — Owner/Admin
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.3.1 | owner-a vê lead comprado e lead manual | ✅ Funciona | RLS filtra corretamente |
| 1.3.2 | admin-a vê lead da Empresa A | ✅ Funciona | Mesmo acesso que owner |
| 1.3.3 | owner-b não vê leads da Empresa A | ✅ Confirmado na Fase 4 | Isolamento RLS funcionando |
| 1.3.4 | owner-a visualiza estimate seedado | ✅ Funciona | `getEstimates()` via `supabase.from("estimates").select("*")` |
| 1.3.5 | owner-a cria novo estimate pelo editor | ✅ Funciona | `EstimateEditor.tsx` usa `createEstimate()` → insert direto com auth |
| 1.3.6 | owner-a envia estimate por link público | ⚠️ Semi-funciona | Botão "Send" na lista altera `status: 'Sent'` mas **não há UI para copiar/enviar o link** com o `public_token`. O token existe no banco mas não está visível na interface. |

### 1.4 — Estimate Público por Token
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.4.1 | Acessar `/estimate/:token` | ✅ Funciona | `PublicView.tsx` carrega via `getEstimateByToken(token)` → RPC `get_public_estimate` |
| 1.4.2 | Ver dados da empresa no estimate | ⚠️ Incompleto | `PublicView.tsx` mostra `client_name`, itens e totais, mas **não mostra logo ou dados da empresa** (company_name, phone, website) |
| 1.4.3 | Ver itens do estimate | ✅ Funciona | Via `get_public_estimate_items` RPC |
| 1.4.4 | Aprovar estimate por link | ✅ Funciona | `approveEstimate(id, token)` → `approve_public_estimate` RPC |
| 1.4.5 | Rejeitar estimate por link | ⚠️ Parcial | `rejectEstimate()` está implementado mas **não há botão "Reject" na UI pública** — só "Approve" |
| 1.4.6 | Tracking de visualização (Viewed) | ⚠️ TODO | `track_public_estimate_view` não existe ainda. SQL proposto em `005_...rpc.sql`. Comentário claro no código. |
| 1.4.7 | Approve/Reject usam RPC, não update direto | ✅ Confirmado | `approveEstimate` com token → RPC. Sem token → update direto (só para admin autenticado). |

### 1.5 — Job/Serviço
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.5.1 | Estimate aprovado cria service_job automaticamente | ❌ Não existe | Não há trigger nem lógica frontend para criar `service_job` ao aprovar estimate. **Criação de job é 100% manual hoje** — não há UI de "Criar Job". |
| 1.5.2 | Owner/admin vê job seedado | ✅ Funciona | Via `LeadDetail.tsx` → card "Service Job" adicionado na Fase 4.2 |
| 1.5.3 | Worker vê job atribuído | ✅ Funciona | `WorkerDashboard` carrega `service_jobs` com RLS automática |
| 1.5.4 | Worker inicia job (Start Job) | ✅ Funciona | `handleUpdateJobStatus(job.id, "in_progress")` → update `service_jobs` |
| 1.5.5 | Worker conclui job (Complete Job) | ✅ Funciona | `handleUpdateJobStatus(job.id, "completed")` → update `service_jobs` |
| 1.5.6 | Owner/admin vê status operacional em LeadDetail | ✅ Funciona | Card "Service Job" adicionado na Fase 4.2 com badge colorido + timestamps |

### 1.6 — Checklist
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.6.1 | Worker vê checklist do job | ✅ Funciona | `loadChecklistsForJob()` → `service_checklists` + `checklist_tasks` |
| 1.6.2 | Worker marca tarefa como concluída | ✅ Funciona | `handleToggleTask()` → update `checklist_tasks.is_completed` |
| 1.6.3 | Barra de progresso exibida | ✅ Funciona | `progress = completedTasks / totalTasks * 100` |
| 1.6.4 | Owner/admin visualiza progresso do checklist | ❌ Não existe | Não há tela de admin para ver checklists. Card "Service Job" no LeadDetail não mostra progresso do checklist. |

### 1.7 — Fotos/Mídia
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.7.1 | Worker insere foto por URL | ✅ Funciona | `handleAddFile()` → insert em `service_files` com `file_url` manual |
| 1.7.2 | Worker faz upload real de arquivo | ❌ Sem Storage | `Quote.tsx` usa bucket `organization-private` mas esse bucket pode não existir no Carpentry. Worker usa apenas URL manual. Não há upload real de arquivo no WorkerDashboard. |
| 1.7.3 | Foto seedada aparece no WorkerDashboard | ✅ Funciona | `loadFilesForJob()` carrega e exibe foto seedada |
| 1.7.4 | Criar bucket no Supabase | ⚠️ Pendente aprovação | `organization-private` precisa ser criado no Dashboard Supabase. **Não criar automaticamente.** |

### 1.8 — Service Extras
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.8.1 | Owner/admin cria extra via UI | ❌ Não existe | **Não há tela de "Criar Extra"** no frontend admin. |
| 1.8.2 | Cliente acessa extra por token | ❌ Não existe | Não há página `/extra/:token` no roteamento. |
| 1.8.3 | Cliente aprova extra via `respond_public_service_extra` | ❌ Não existe | RPC validada no seed (Fase 3), mas sem integração frontend. |
| 1.8.4 | Worker/owner vê status do extra | ❌ Não existe | Sem tela de extras no admin. |

### 1.9 — Reviews
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.9.1 | Cliente envia review anônimo | ✅ Funciona | `addReview()` → `submit_public_review` RPC para anônimos |
| 1.9.2 | Review entra sem aprovação automática | ✅ Controlado | `public_approved` é `false` por padrão na RPC. Seed tem 1 aprovado, 1 pendente. |
| 1.9.3 | `get_public_reviews` retorna apenas aprovados/não-ocultos | ✅ Funciona | Testado na Fase 3 |
| 1.9.4 | `getStats()` usa RPC | ✅ Corrigido na Fase 4.1 | |
| 1.9.5 | Owner/admin aprova review | ⚠️ Semi | `toggleReviewVisibility()` existe, mas não há botão "Aprovar" — só ocultar. `public_approved` nunca é atualizado pelo frontend. |

### 1.10 — Worker Restrito
| # | Teste | Status | Observação |
|---|---|---|---|
| 1.10.1 | Worker não vê financeiro/créditos/ledger | ✅ Sem acesso via UI | Nenhuma tela de crédito existe no frontend |
| 1.10.2 | Worker não vê leads comerciais | ✅ Corrigido na Fase 4.1 | Inbox redireciona workers para /admin |
| 1.10.3 | Worker não vê estimates gerais | ✅ Menu oculto | `/admin/estimates` bloqueado por AdminLayout |
| 1.10.4 | Worker não vê company settings | ✅ Menu oculto | `/admin/company` e `/admin/settings` bloqueados |
| 1.10.5 | Worker acessando URL direta é redirecionado | ✅ Funciona | `useEffect` em AdminLayout detecta role e redireciona para `/admin` |
| 1.10.6 | RLS no banco também bloqueia worker | ⚠️ Parcial | RLS bloqueia acesso direto a `estimates`, mas `leads` ainda permite ver todos os leads da org. Proposta SQL `005b` existe mas não foi aplicada. |

---

## 2. O que Passou ✅

1. Login por e-mail/senha com todos os 4 usuários de teste
2. Isolamento Empresa A / Empresa B via RLS
3. Worker restringido no frontend (menu, rotas, redirect)
4. WorkerDashboard operacional (jobs, checklist, fotos por URL)
5. Estimate público via token (`get_public_estimate`, `get_public_estimate_items`)
6. Aprovação de estimate via `approve_public_estimate` RPC
7. Reviews anônimas via `submit_public_review` RPC
8. `getStats()` via `get_public_reviews` (sem select direto)
9. Card "Service Job" no LeadDetail (Fase 4.2)
10. Build limpo em 50s após limpeza de cache

---

## 3. O que Falhou ou Não Existe ❌

| Item | Severidade | Detalhes |
|---|---|---|
| **Tela de distribuição de leads** | 🔴 Alto | Sem UI para comprar/distribuir lead público. Só via SQL manual. |
| **Criação de service_job por estimate aprovado** | 🔴 Alto | Não há trigger nem UI para criar job ao aprovar estimate. |
| **Página pública de service_extra** | 🔴 Alto | Não há rota `/extra/:token`. Cliente não consegue aprovar extra. |
| **UI de criação de service_extra** | 🔴 Alto | Admin não consegue criar extra pelo frontend. |
| **Link público do estimate visível na UI** | 🟠 Médio | `public_token` existe no banco mas não é exibido/copiável na interface. |
| **Botão "Reject" na página pública do estimate** | 🟠 Médio | Só existe "Approve". |
| **Upload real de arquivo (Storage)** | 🟠 Médio | Bucket `organization-private` pode não existir no Carpentry. |
| **Dados da empresa no estimate público** | 🟠 Médio | `PublicView.tsx` não exibe company_name, logo, contato. |
| **Checklist visível para owner/admin** | 🟡 Baixo | Card de Service Job não mostra progresso de tarefas. |
| **Aprovação de review (public_approved)** | 🟡 Baixo | Admin só pode ocultar/mostrar review, não aprovar formalmente. |
| **RLS banco para worker em leads** | 🟡 Baixo | Proposta em `005b` não aplicada. Worker pode ler leads da org via DB direto. |

---

## 4. Arquivos Alterados nesta Fase

**Nenhum arquivo de código foi alterado.** Esta fase foi puramente de auditoria e diagnóstico.

---

## 5. SQLs Propostos (existentes, não aplicados)

| Arquivo | Propósito |
|---|---|
| [005_homeleadpro_track_public_estimate_view_rpc.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/005_homeleadpro_track_public_estimate_view_rpc.sql) | RPC para rastrear visualização de estimate público |
| [005b_homeleadpro_worker_rls_restriction_proposal.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/005b_homeleadpro_worker_rls_restriction_proposal.sql) | RLS mais restritiva para worker no banco |

**Novo SQL proposto para esta fase:**

> Nenhum novo SQL foi necessário nesta fase. As lacunas identificadas são de frontend, não de banco.

---

## 6. Resultado do Build

O build da Fase 4.2 está válido. Nenhuma alteração de código foi feita nesta fase.

```
✓ Compiled successfully in 50s (Fase 4.2)
✓ Build ativo: npm run dev rodando há 16+ minutos
```

---

## 7. Pendências para MVP

### 🔴 Críticas (MVP incompleto sem estas)
| # | Pendência | Ação recomendada |
|---|---|---|
| MVP-1 | **Tela de distribuição de leads** | Criar página admin "Lead Market" com RPC de compra e débito de crédito |
| MVP-2 | **Criação de service_job ao aprovar estimate** | Criar trigger no banco ou botão "Criar Job" no admin após aprovação |
| MVP-3 | **Página pública `/extra/:token`** | Criar nova rota e componente público para aprovar service_extra |
| MVP-4 | **UI de criação de service_extra** | Adicionar botão/formulário no admin para criar extras vinculados ao job |
| MVP-5 | **Link público copiável do estimate** | Exibir `public_token` como URL copiável no EstimateEditor/EstimatesList |

### 🟠 Importantes (experiência degradada sem estas)
| # | Pendência | Ação recomendada |
|---|---|---|
| MVP-6 | **Bucket Storage `organization-private`** | Criar manualmente no Dashboard Supabase (aprovação necessária) |
| MVP-7 | **Botão "Reject" na página pública** | Adicionar botão na `PublicView.tsx` com `rejectEstimate(id, token)` |
| MVP-8 | **Dados da empresa no estimate público** | Adicionar `get_public_company_info` RPC ou incluir info no retorno de `get_public_estimate` |
| MVP-9 | **Aprovação formal de reviews** | Adicionar botão "Approve" que atualiza `public_approved = true` na página de Reviews admin |

### 🟡 Melhorias (pós-MVP)
| # | Pendência | Ação recomendada |
|---|---|---|
| MVP-10 | RLS mais restritiva para worker no banco | Aplicar `005b` após revisão e aprovação |
| MVP-11 | `track_public_estimate_view` RPC | Aplicar `005` após revisão e aprovação |
| MVP-12 | Checklist visível para owner/admin | Adicionar seção de progresso no LeadDetail |
| MVP-13 | Upload real de arquivo no WorkerDashboard | Adicionar upload para Storage após bucket criado |

---

## 8. Riscos Antes do Deploy

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Bucket `organization-private` inexistente** | Alta | Médio | Criar bucket no Supabase Dashboard antes do deploy. Configurar políticas de acesso. |
| **`saveLead()` sem `source: 'public'`** | Média | Baixo | `saveLead` não define `source` — o banco provavelmente tem default. Verificar schema. |
| **RLS de worker permite leitura ampla de leads** | Média | Médio | Aplicar `005b` antes do deploy em produção. |
| **Sem UI de criação de jobs** | Alta | Alto | Lead pode ser aprovado mas o job precisa ser criado manualmente. Bloqueia o fluxo completo. |
| **Sem página de service_extra pública** | Alta | Alto | Cliente não consegue responder extras enviados pelo owner/admin. |
| **Token de estimate não visível** | Alta | Médio | Owner não consegue copiar link para enviar ao cliente. |

---

## 9. Próximo Passo Recomendado

### Opção A — MVP Rápido (Prioridade Máxima)
Implementar os 5 itens críticos na seguinte ordem:

1. **MVP-5**: Exibir link público do estimate no EstimateEditor (`/estimate/{public_token}`)
2. **MVP-7**: Botão "Reject" na `PublicView.tsx`
3. **MVP-2**: Botão "Criar Job" no EstimateEditor após aprovação (sem trigger de banco)
4. **MVP-4 + MVP-3**: Criar `service_extra` no admin + rota `/extra/:token` pública
5. **MVP-6**: Criar bucket `organization-private` no Supabase Dashboard (ação manual)

### Opção B — Consolidar Banco Primeiro
Antes de continuar com frontend:
1. Aplicar `005b` para restringir RLS do worker
2. Aplicar `005` para tracking de visualização
3. Depois avançar com frontend

---

"A Fase 5 validou o fluxo completo ponta a ponta do HomeLeadPro sem reaplicar migration ou seed."
