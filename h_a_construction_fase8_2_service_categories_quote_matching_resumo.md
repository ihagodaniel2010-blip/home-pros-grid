# Fase 8.2 — Service Categories, Quote Questions & Lead Matching Refinement

## 1. Visão Geral
A Fase 8.2 refinou e auditou as categorias de serviços de construção e reforma, perguntas dinâmicas do formulário de orçamento e o mecanismo de matching de leads para a H&A Construction.

---

## 2. Aplicação e Validação da Migração SQL 017
- **Rollback Test**: Executado previamente em ambiente de transação (`BEGIN; ... ROLLBACK;`), validando a criação de categorias, tarefas, question flows, mapeamento de slugs e a garantia de idempotência.
- **SQL Oficial Aplicada**: A migração `017_homeleadpro_service_question_flow_refinement.sql` foi aplicada com sucesso no Supabase.
- **Categorias Criadas/Atualizadas**:
  - `Roofing` (`roofing`)
  - `Painting` (`painting`)
  - `Remodeling` (`remodeling`)
- **Service Tasks Criadas (9 tarefas)**:
  - Roofing: `roof-replacement`, `roof-repair-leak`, `shingle-roofing`
  - Painting: `interior-painting`, `exterior-painting`, `cabinet-painting`
  - Remodeling: `kitchen-remodel-full`, `bathroom-remodel-full`, `basement-finishing`
- **Preços Atualizados**: As colunas `min_lead_price`, `max_lead_price` e `default_lead_price` foram configuradas e atualizadas no `UPSERT`.
- **Question Flows Refinados**: Pergunta inicial `project_type` cadastrada sem duplicatas para `roofing`, `painting` e `remodeling`.

---

## 3. Garantias de Estabilidade e Rotas Existentes
- **Sem Telas Brancas**: Rotas `/quote/roofing`, `/quote/painting`, `/quote/remodeling`, `/quote/drywall-plaster` e `/quote/flooring-carpet` funcionam 100%.
- **Lead Matching & RPC**: A RPC `submit_public_lead` resolve os `service_task_id` corretos com base nas opções selecionadas.
- **Proteção do Admin e RLS**: Painel administrativo `/admin`, `LeadMarket` (dados mascarados antes da compra) e restrições de `worker` permanecem intactos.
