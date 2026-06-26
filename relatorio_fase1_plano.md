# Relatório Fase 1 — Plano de Banco e RLS do HomeLeadPro

> **Nota de nomenclatura:** o produto anteriormente chamado Barrigudo passa a ter o nome comercial HomeLeadPro. Esta atualização altera apenas os documentos de planejamento, sem refatoração técnica no código.

---

## 1. Resumo Executivo
Esta etapa consolidou a especificação estrutural de persistência e segurança lógica do **HomeLeadPro SaaS Multiempresa**. Desenhamos e entregamos de forma local (sem executar no banco de dados de produção do Supabase) o conjunto completo de 3 migrações SQL estruturadas e 3 planos de documentação explicativos.

O plano relacional comporta 28 tabelas integradas, cobrindo o núcleo multi-tenant, controle de cotas de sócios fechando em 100%, ledgers contábeis de créditos pré-pagos sem possibilidade de saldo negativo, e controle estrito de acessos Row Level Security (RLS) para proteger dados sensíveis de concorrência e vazamentos de telefones de clientes finais.

---

## 2. Arquivos Criados
Todos os arquivos foram criados com sucesso na raiz do seu projeto local:
* **Migrações SQL locais (Rascunhos):**
  * [000_homeleadpro_schema_draft.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/000_homeleadpro_schema_draft.sql) — DDL de criação e schemas das tabelas.
  * [001_homeleadpro_rls_draft.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/001_homeleadpro_rls_draft.sql) — Configuração de RLS e políticas por perfil.
  * [002_homeleadpro_functions_triggers_draft.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/002_homeleadpro_functions_triggers_draft.sql) — Triggers de recálculo financeiro, validações societárias e geração de tokens.
* **Documentação Técnica Local:**
  * [homeleadpro_database_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_database_plan.md) — Diagrama e especificação de relacionamentos do banco.
  * [homeleadpro_rls_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_rls_plan.md) — Matriz de acesso de segurança lógica e RLS.
  * [homeleadpro_storage_plan.md](file:///c:/Desenvolvimento/SiteIhago/Site/docs/homeleadpro_storage_plan.md) — Plano de buckets de Storage e limites de mídia.

---

## 3. Tabelas Planejadas
As 28 tabelas essenciais para a operação do HomeLeadPro SaaS foram estruturadas com tipagem Postgres moderna e constraints de segurança:
1. `organizations`: Empresas cadastradas no SaaS.
2. `organization_users`: Associação e permissões de funcionários.
3. `company_settings`: Dados comerciais, chaves de recebimento e SMS.
4. `service_categories`: Árvores de categorias e especialidades.
5. `company_services`: Especialidades oferecidas pela empresa.
6. `us_locations`: Base de CEPs, cidades e geolocalização dos EUA.
7. `company_service_areas`: Raio em milhas e ZIP codes atendidos.
8. `leads`: Contatos recebidos e dados de vistoria.
9. `lead_files`: Arquivos de mídia do lead.
10. `lead_pricing_rules`: Regras tarifárias de compra de leads.
11. `platform_settings`: Variáveis globais do SaaS (Super Admin).
12. `lead_distributions`: Histórico de distribuições e concorrência.
13. `organization_credit_ledger`: Registro contábil de recargas e débitos de créditos.
14. `sms_threads`: Canais de mensagens mascaradas empresa-cliente.
15. `sms_messages`: Histórico de mensagens enviadas/recebidas.
16. `estimates`: Orçamentos, impostos locais e descontos.
17. `estimate_items`: Insumos e itens do orçamento.
18. `estimate_payments_manual`: Baixa de parcelas em Zelle, Venmo, dinheiro, etc.
19. `service_jobs`: Ordens de serviço em andamento.
20. `service_checklists`: Checklists vinculados aos projetos.
21. `checklist_tasks`: Tarefas individuais do instalador em campo.
22. `service_extras`: Custos extras para aprovação digital do cliente.
23. `service_files`: Fotos de andamento de obras e comprovantes de conclusão.
24. `receipts`: Notas fiscais de compras de materiais e despesas.
25. `company_partners`: Sócios societários (Constraint matemática total 100%).
26. `employee_assignments`: Atribuição de instaladores e liberação de endereços.
27. `reviews`: Fila de depoimentos de Massachusetts (tabela adaptada).
28. `audit_logs`: Auditoria e logs de segurança de acessos.

---

## 4. Relacionamentos Principais
* **Multi-tenant Core:** As tabelas operacionais (leads, estimates, jobs, checklists, partners) referenciam `organizations(id)` via chave estrangeira `ON DELETE CASCADE`. Isso permite que a remoção ou inativação de uma empresa no SaaS limpe de forma segura todos os dados dependentes relacionados.
* **Integridade das Faturas:** Itens de orçamentos (`estimate_items`) referenciam a fatura pai (`estimates(id)`). O recálculo financeiro do subtotal e impostos na fatura principal ocorre por triggers automáticos baseados nas mudanças dessas linhas.

---

## 5. Indexes Recomendados
Para garantir consultas instantâneas e autocompletar dinâmico:
* `idx_us_locations_zip` e `idx_us_locations_city` em `us_locations` (Lookup rápido de ZIP codes no wizard).
* `idx_leads_organization_id` e `idx_estimates_organization_id` (Filtros instantâneos de dados no painel da empresa).
* `idx_leads_public_token` e `idx_estimates_public_token` (Verificação ágil de links seguros por tokens sem login).
* `idx_reviews_rating` (Ordenação de avaliações e vitrine).

---

## 6. Constraints Recomendadas
* `balance_after >= 0` em `organization_credit_ledger` (Impede o banco de registrar débitos que resultem em saldo negativo).
* `unique (lead_id, organization_id)` em `lead_distributions` (Evita que o sistema cobre a mesma empresa duas vezes pelo mesmo lead).
* `unique (organization_id, service_category_id)` em `company_services` (Evita duplicação de cadastros de especialidades).
* Check constraints em status (`estimates.status` e `leads.status`) para evitar inserções de valores fora das regras comerciais homologadas.

---

## 7. Funções/Triggers Planejadas
* `get_organization_credit_balance(org_id)`: Calcula a soma de créditos do ledger.
* `trg_fn_prevent_negative_balance()`: Trigger que barra o insert de débitos caso o saldo resultante fique negativo.
* `debit_lead_distribution()`: Trigger após insert na tabela de distribuições que insere automaticamente o débito no ledger e atualiza o status do lead para "Contacted".
* `recalculate_estimate_totals()`: Trigger em `estimate_items` que recalcula dinamicamente subtotal, taxas, totais e status de payment (`unpaid`/`partially_paid`/`paid`) do cabeçalho da proposta.
* `validate_partner_share_percentages()`: Trigger em `company_partners` que valida se a soma das cotas de sócios ativos não ultrapassa 100% no insert/update.
* `generate_public_token()`: Função hash SHA256 criptográfica para links sem login.

---

## 8. RLS Planejado por Perfil
* **Super Admin:** Leitura e escrita irrestritas globais.
* **Owner:** Controle total do `organization_id` correspondente, incluindo sócios (`company_partners`) e setups financeiros.
* **Admin:** Gestão do CRM e faturamento da própria empresa; bloqueado de ler/editar dados societários e sócios.
* **Worker:** Bloqueado de ver KPIs, estimates, créditos e dados de sócios. Só vê service_jobs atribuídos a ele e só visualiza o endereço completo se a flag de autorização estiver ativa.
* **Cliente Final:** Apenas leitura de dados vinculados ao `public_token` da fatura ou do extra correspondente.

---

## 9. Storage Buckets Planejados
* `lead-files` (Upload público; leitura restrita à empresa vinculada).
* `service-files` (Upload restrito à equipe; leitura restrita e filtrada por visibilidade de cliente).
* `receipt-files` (Upload e leitura restritos aos gestores da empresa; bloqueado para funcionários e clientes).
* `company-assets` (Upload do Owner; leitura pública para carregar logotipos corporativos nas faturas).
* `public-portfolio` (Upload exclusivo do Super Admin; leitura pública para a Landing Page).

---

## 10. Compatibilidade com Código Atual
O plano foi projetado para manter total compatibilidade com as chamadas de banco do frontend detectadas na Fase 0:
* O cliente de visualização pública ([PublicView.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/PublicView.tsx)) continua selecionando faturas pelo campo `public_token` na tabela `estimates`.
* Os campos de contato e cadastros mantêm a tipagem padrão para não quebrar referências React.
* A tabela `reviews` existente foi adaptada adicionando campos relacionais sem apagar os campos de dados originais.

---

## 11. Pontos de Atenção sobre camelCase vs snake_case
* **Diagnóstico:** O código atual do frontend utiliza camelCase em algumas entidades (ex: `selectedServiceOption`, `ownerNotes` em leads) e snake_case em outras (ex: `organization_id`, `amount_paid` em estimates).
* **Solução Proposta:** No schema físico do banco de dados PostgreSQL, **adotamos snake_case estrito em todas as tabelas e colunas** (ex: `selected_service_option`, `owner_notes`), pois é a boa prática relacional padrão. 
* **Transição na Fase 4:** No momento de conectar o frontend público na Fase 4, criaremos um mapeador simples nas chamadas do Supabase que converte as chaves camelCase do wizard React para snake_case no payload de insert, mantendo a compatibilidade visual do wizard intocada.

---

## 12. Como Testar RLS na Fase 2
Na Fase 2 (aplicação em banco de desenvolvimento), validaremos as políticas RLS executando as seguintes queries simuladas no editor de consultas do Supabase:
1. **Teste Multi-tenant:**
   ```sql
   -- Logar como usuário fictício da Empresa A
   select set_config('role', 'authenticated', true);
   select set_config('request.jwt.claims', '{"sub": "uuid-worker-empresa-a"}', true);
   -- Tentar ler estimates da Empresa B (deve retornar 0 linhas)
   select * from public.estimates where organization_id = 'uuid-empresa-b';
   ```
2. **Teste Worker (Finanças):**
   ```sql
   -- Tentar ler ledger de créditos ou parceiros (deve retornar erro de acesso negado ou 0 linhas)
   select * from public.company_partners where organization_id = 'uuid-empresa-a';
   ```

---

## 13. Riscos Antes de Aplicar
* **Relações Circulares de Chaves Estrangeiras:** O relacionamento entre `estimates` (que aponta para `receipt_file_id` em `service_files`) e `service_files` (que aponta para `receipt_id` em `receipts`) exige execução ordenada de comandos DDL com ALTER posterior para não quebrar a ordem de criação.
* **Volume de Tráfego de Imagens:** Instalações com uploads pesados por trabalhadores de campo sem sinal 4G estável. Mitigado pela compactação client-side obrigatória.

---

## 14. Decisões Pendentes
1. Confirmar se a conversão de leads para snake_case no frontend deve ocorrer por meio de mapeadores nas funções do cliente ou se faremos refatoração do wizard no pós-MVP.
2. Definir o local físico de hospedagem das chaves da IA simples (Gemini API) no MVP (Edge Functions do Supabase).

---

## 15. Próxima Fase Recomendada
A próxima fase recomendada é a **Fase 2 — Aplicação Controlada do Banco em Ambiente de Desenvolvimento**, que consiste em criar as tabelas na nuvem de testes e habilitar as políticas de RLS.

---

“Nenhuma migration foi aplicada. Esta fase criou apenas arquivos locais revisáveis de plano de banco e RLS do HomeLeadPro.”
