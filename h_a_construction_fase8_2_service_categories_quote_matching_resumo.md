# Fase 8.2 — Service Categories, Quote Questions & Lead Matching Refinement

## 1. Visão Geral
A Fase 8.2 refinou e auditou as categorias de serviços de construção e reforma, perguntas dinâmicas do formulário de orçamento e o mecanismo de matching de leads para a H&A Construction.

---

## 2. Categorias e Mapeamento de Slugs
- **Slugs & Rotas**: Mapeados e sincronizados no frontend (`drywall` → `drywall-plaster`, `flooring` → `flooring-carpet`).
- **Serviços Principais Auditados**: Carpentry, Plumbing, Drywall/Plaster, Flooring/Carpet, Roofing, Painting, Remodeling.
- **Limpeza (Cleaning)**: Mantida catalogada no acervo como serviço complementar de pós-obra ("Post Construction Cleaning").

---

## 3. Question Flows & Textos do Formulário
- **Linguagem Padrão**: 100% em Inglês profissional voltado para o mercado norte-americano.
- **Branding Auditado**: Zero menções a Barrigudo ou marcas legadas no questionário.
- **Resolução de Tasks**: Opções do formulário apontam para `maps_to_task_slug`, permitindo à RPC `submit_public_lead` vincular o `service_task_id` exato no banco de dados.

---

## 4. Proposta de Migração SQL (Não Aplicada)
- Criado arquivo de migração proposta: `supabase/migrations/017_homeleadpro_service_question_flow_refinement.sql`
- Criado arquivo de teste de rollback: `supabase/migrations/017_test_service_question_flow_refinement_rollback.sql`
- **Status do Banco**: Nenhum SQL foi aplicado no Supabase. O banco de dados permanece inalterado aguardando autorização.
