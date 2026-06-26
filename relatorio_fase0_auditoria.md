# Relatório Fase 0 — Auditoria Rápida do Estado Atual do HomeLeadPro

> **Nota de nomenclatura:** o produto anteriormente chamado Barrigudo passa a ter o nome comercial HomeLeadPro. Esta atualização altera apenas os documentos de planejamento, sem refatoração técnica no código.

---

## 1. Resumo Executivo
Esta auditoria técnica mapeia detalhadamente a infraestrutura, a base de código e o status das tabelas do projeto **HomeLeadPro** antes de iniciarmos qualquer alteração prática. 

O projeto apresenta uma base visual premium (glassmorphism e Tailwind) em excelente estado de prontidão, operando como uma Single Page Application (React SPA) encapsulada sob uma infraestrutura do framework **Next.js** (com renderização do lado do cliente e hidratação dinâmica via `ssr: false`). Há também um servidor complementar em **Express (Node.js)** que gerencia a persistência local (arquivos JSON) de portfólio, logs de acessos e configurações.

A conexão ao Supabase já está estruturada de forma básica no cliente, mas apenas a tabela `reviews` possui DDL e Row Level Security (RLS) definidos. As tabelas centrais de leads e faturamento ainda não estão criadas no banco nem blindadas, representando o principal gap de segurança a ser solucionado.

---

## 2. Arquitetura Atual
* **Frontend SPA e Next.js:** O frontend é renderizado em React 19 e TypeScript 5.8. O projeto utiliza o Next.js (App Router) como wrapper. A rota coringa [page.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/app/%5B%5B...slug%5D%5D/page.tsx) importa dinamicamente o arquivo principal [App.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/App.tsx) da SPA, desativando o Server-Side Rendering (SSR). Isso permite que o roteador client-side (`react-router-dom`) gerencie a navegação de forma íntegra.
* **Server Express Local:** O arquivo [index.js](file:///c:/Desenvolvimento/SiteIhago/Site/server/index.js) configura um backend local em Express para lidar com a gravação e leitura do portfólio (`data/portfolio.json`), logs de acessos de administradores (`data/login-attempts.json`) e variáveis de layout (`data/site-settings.json`).
* **Supabase BaaS:** A integração client-side está pronta na pasta `src/lib/`, contendo clientes com isolamento de persistência de sessão para evitar concorrências (Safari/Mobile LockManager).

---

## 3. Scripts e Build
A análise do [package.json](file:///c:/Desenvolvimento/SiteIhago/Site/package.json) revelou os seguintes scripts disponíveis:
* `dev`: `next dev -p 3000` (Inicia o servidor de desenvolvimento Next.js na porta 3000).
* `dev:vite`: `vite` (Inicia o servidor local do Vite, porém falha pela ausência do arquivo `index.html` na raiz).
* `dev:server` / `server`: `node server/index.js` (Inicia a API local Express na porta 8787).
* `build`: `next build` (Compila a aplicação Next.js para produção).
* `build:vite`: `vite build` (Tenta compilar a SPA via Vite, falha em produção).

### Teste de Builds:
1. **Build do Vite (`npm run build:vite`):** Falha. O Vite espera encontrar o arquivo de entrada padrão `index.html` na raiz do projeto, mas ele foi renomeado para `index.html.vite`. Adicionalmente, `vite.config.ts` foi renomeado para `vite.config.ts.bak`.
2. **Build do Next.js (`npm run build`):** Sucesso absoluto. A compilação é concluída sem erros em menos de 1 minuto, gerando os bundles estáticos das rotas dinâmicas do App Router.

---

## 4. Mapa de Pastas e Arquivos

Mapeamos a utilidade e estado dos principais arquivos do ecossistema:

| Arquivo | Função | Estado | Ação Futura (Preservar/Substituir) |
| :--- | :--- | :---: | :--- |
| [App.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/App.tsx) | Roteador e inicializador client-side da SPA. | 🟢 Real | **Preservar**. Concentra os caminhos e telas do painel e site público. |
| [main.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/main.tsx) | Ponto de entrada original da compilação do Vite. | 🟢 Real | **Preservar**. Usado caso o projeto volte a rodar build nativo em Vite. |
| [supabase.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/supabase.ts) | Instancia os clientes `supabase` e `supabasePublic`. | 🟢 Real | **Preservar**. Extremamente importante para isolamento de abas. |
| [leads.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/leads.ts) | Salva, atualiza e busca leads em Supabase/Local. | 🟡 Parcial | **Preservar e Refatorar**. Possui fallback para localStorage se Supabase offline. |
| [estimates.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/estimates.ts) | Operações do banco de faturamento (estimates/payments). | 🟡 Parcial | **Preservar**. Possui rotinas de delete-insert que precisam de upsert na Fase 6. |
| [pdf-generator.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/pdf-generator.ts) | Desenha a fatura vetorizada em formato PDF no browser. | 🟢 Real | **Preservar**. Possui código comentado de imagem/logo que deve ser ativado. |
| [UserContext.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/context/UserContext.tsx) | Gerencia a sessão do usuário e associações de org. | 🟢 Real | **Preservar**. Mapeia roles e organizações do usuário ativo. |
| [LanguageContext.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/context/LanguageContext.tsx) | Gerencia os dicionários dinâmicos de inglês/português. | 🟢 Real | **Preservar**. Essencial para atendimento multilíngue nos EUA. |
| [site.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/config/site.ts) | Variáveis estáticas e lista de cidades de Massachusetts. | 🟢 Real | **Preservar**. |
| [Index.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/Index.tsx) | Landing page e marketing de captação de leads. | 🟢 Real | **Preservar**. |
| [Quote.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/Quote.tsx) | Assistente e wizard progressivo de orçamento público. | 🟢 Real | **Preservar**. Valida ZIP codes e comprime imagens client-side. |
| [Experiences.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/Experiences.tsx) | Página pública de coleta de reviews do cliente final. | 🟢 Real | **Preservar**. |
| [PublicView.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/PublicView.tsx) | Link seguro em que o cliente final visualiza/aprova estimate. | 🟢 Real | **Preservar**. |
| [Dashboard.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/Dashboard.tsx) | KPI's de faturamento, gráficos de leads e logs locais. | 🟡 Parcial | **Preservar**. Consome dados estáticos simulados. |
| [EstimateEditor.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/EstimateEditor.tsx) | Editor de itens, impostos, descontos e amortizações. | 🟢 Real | **Preservar**. |
| [CompanySettings.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/CompanySettings.tsx) | Cadastro de telefone, logo e licença estadual. | 🟢 Real | **Preservar**. |
| [index.js](file:///c:/Desenvolvimento/SiteIhago/Site/server/index.js) | Servidor local Express de dados simulados em disco. | 🔴 Mock | **Remover no pós-MVP**. Centralizar dados no Supabase. |
| [remote_setup.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/remote_setup.sql) | DDL original de criação e RLS do portfólio de reviews. | 🟢 Real | **Preservar**. Serve como fundação DDL. |
| [portfolio.json](file:///c:/Desenvolvimento/SiteIhago/Site/data/portfolio.json) | Banco estático de dados da vitrine pública de Massachusetts. | 🔴 Mock | **Remover no pós-MVP**. Centralizar no Supabase PostgreSQL. |

---

## 5. Estado das Funcionalidades Atuais

Classificação de prontidão de recursos operacionais no código atual:

### Área Pública (Cliente Final)
* **Landing Page:** 🟢 **Pronta** (Visualização funcional e integrada).
* **Lista de Serviços:** 🟢 **Pronta** (Navegação estruturada).
* **Portfólio:** 🟡 **Parcial** (Exibição funcional, mas alimentada via JSON local no Express).
* **Reviews/Depoimentos:** 🟢 **Pronta** (Formulário envia dados via Supabase se configurado).
* **Wizard de Lead:** 🟢 **Pronta** (Formulário progressivo com compactação e validação ZIP local).
* **Upload de Foto/Vídeo:** 🟢 **Pronta** (Integrado no wizard).
* **Página de Sucesso:** 🟢 **Pronta**.
* **Página Pública de Estimate:** 🟢 **Pronta** (Acesso por token ativo).
* **Página de Aprovação de Extras:** 🔴 **Não encontrada** (A ser desenvolvida na Fase 10).
* **Página de Review (Feedback):** 🟢 **Pronta** (Experiences).

### CRM / Painel Administrativo da Empresa
* **Login Admin:** 🟢 **Pronta** (Login social via Google OAuth Supabase ativo).
* **Dashboard KPIs:** 🟡 **Parcial** (Cards renderizados com dados simulados/mockados).
* **Inbox de Leads:** 🟢 **Pronta** (CRM lista leads por status).
* **Detalhes do Lead:** 🟢 **Pronta** (Visualização de dados e mídias enviadas).
* **Lista de Estimates:** 🟢 **Pronta** (Acompanhamento de faturamento).
* **Editor de Estimates:** 🟡 **Parcial** (Cálculo e formatação excelentes; rotina de salvamento destrutiva).
* **Gerador de PDF:** 🟢 **Pronta** (Exportação client-side instantânea).
* **Configurações da Empresa:** 🟡 **Parcial** (Upsert de dados mockados / Express local).
* **Reviews Admin:** 🟢 **Pronta** (Fila de moderação de depoimentos).
* **Analytics:** 🟡 **Parcial** (Gráficos visuais utilizam mocks estáticos).
* **Pagamentos Manuais:** 🟡 **Parcial** (Registro do total amortizado recalculando balanço; sem logs de transação).
* **Módulo de Recibos:** 🔴 **Não encontrada** (A ser desenvolvida na Fase 11).
* **Módulo de Sócios (Regra 100%):** 🔴 **Não encontrada** (A ser desenvolvida na Fase 11).
* **Módulo de Funcionários (Acesso limitado):** 🔴 **Não encontrada** (A ser desenvolvida na Fase 9).

---

## 6. Funcionalidades Mockadas/Parciais
Detalhamento de simulações ativas no projeto:
1. **Fallback de Leads (Local Storage):** Se Supabase offline, grava leads no navegador do profissional ([leads.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/leads.ts#L35-L77)).
2. **E-mails Transacionais:** Toasts informam *"Email sent successfully!"*, mas não há SMTP configurado.
3. **Mídia do PDF:** Inserção do logotipo corporativo no cabeçalho do PDF comentada/simulada no [pdf-generator.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/pdf-generator.ts#L18-L27).
4. **Logs de Login:** Tentativas de login recarregam array vazio do lado do cliente no [admin-auth.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/admin-auth.ts#L54-L58).
5. **Site Settings e Portfólio:** Alimentados via arquivos JSON do servidor Express local (`/api/portfolio`, `/api/site-settings`).

---

## 7. Estado Atual do Supabase
* **Tabelas Criadas (SQL/Migrations):** Apenas a tabela `reviews` está mapeada fisicamente na pasta `supabase/migrations/` e com políticas RLS implementadas.
* **Políticas de RLS do Banco:**
  * `reviews`: Permite leitura anônima para itens não ocultos (`is_hidden = false`), inserção e atualizações restritas ao criador autenticado (`auth.uid() = user_id`).
* **🚨 Riscos de Chave Pública (Anon Key):** O frontend realiza chamadas diretas de escrita e leitura (`supabasePublic`) para captar leads. Se as tabelas `leads` e `estimates` forem criadas na nuvem sem RLS ativo, qualquer usuário inspecionando a rede do navegador pode extrair a Anon Key e executar queries para ler, alterar ou deletar todos os contatos e faturamento de todas as empresas cadastradas no SaaS.

---

## 8. Tabelas e Campos Esperados no Código

Abaixo estão descritos os modelos físicos que a aplicação já mapeia ou espera interagir nas tabelas:

### leads
* `id` (`uuid`, PK)
* `organization_id` (`uuid`, FK -> `organizations`)
* `createdAt` / `created_at` (`timestamptz`)
* `zip` (`text`)
* `selectedServiceOption` (`text`)
* `details` (`text`)
* `fullName` (`text`)
* `address` (`text`)
* `email` (`text`)
* `phone` (`text`)
* `status` (`text`)
* `ownerNotes` (`text`)
* `description` (`text`)
* `preferred_contact_method` (`text`)
* `media_urls` (`text[]`)

### estimates
* `id` (`uuid`, PK)
* `organization_id` (`uuid`, FK -> `organizations`)
* `lead_id` (`uuid`, FK -> `leads`)
* `client_name` (`text`)
* `client_email` (`text`)
* `client_phone` (`text`)
* `client_address` (`text`)
* `client_city` (`text`)
* `client_state` (`text`)
* `client_zip` (`text`)
* `status` (`text`)
* `subtotal` (`numeric`)
* `tax_rate` (`numeric`)
* `tax_amount` (`numeric`)
* `discount_amount` (`numeric`)
* `total_amount` (`numeric`)
* `amount_paid` (`numeric`)
* `balance_due` (`numeric`)
* `payment_status` (`text`)
* `public_token` (`text`, Unique)
* `terms` (`text`)
* `valid_until` (`timestamptz`)

### company_settings
* `organization_id` (`uuid`, PK, FK -> `organizations`)
* `company_name` (`text`)
* `logo_url` (`text`)
* `phone` (`text`)
* `email` (`text`)
* `address` (`text`)
* `license_number` (`text`)
* `insurance_info` (`text`)
* `default_tax_rate` (`numeric`)
* `default_terms` (`text`)

---

## 9. Mocks e Dados Locais
A tabela abaixo lista onde residem os dados estáticos locais no ecossistema:

| Arquivo | Componente / Função | Risco Técnico | Fase de Substituição por Supabase Real |
| :--- | :--- | :--- | :--- |
| [leads.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/leads.ts) | `getLeadsLocal` / `saveLeadLocal` | Perda de dados caso o cliente limpe o cache do navegador. | **Fase 4** (Leads públicos e manuais no banco real). |
| [reviewsService.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/reviewsService.ts) | `LocalReviewsService` | Avaliações não sincronizadas globalmente. | **Fase 12** (Filtro e moderação integrados ao Supabase). |
| [admin-auth.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/admin-auth.ts) | `fetchLoginAttempts` | Falha na auditoria de acessos de segurança. | **Fase 3** (Tabela relacional de logs de login). |
| `data/portfolio.json` | Vitrine pública de Massachusetts | Impossibilidade do profissional editar portfólio no admin. | **Fase 12** (Portfólio dinâmico no Supabase Storage). |
| `data/site-settings.json` | Layout e configurações | Endereços e contatos fixos em arquivo estático de disco. | **Fase 3** (Tabela `company_settings` integrada). |

---

## 10. Riscos Atuais
1. **RLS Inexistente ou Incompleto:** Falha crítica no isolamento multi-tenant se o banco for ativado sem Row Level Security rigoroso.
2. **Conflito de Compilação Híbrida:** A pasta `src/app` (Next.js) e as configurações de build do Next.js coexistem com vestígios e configurações antigas do Vite SPA (como `index.html.vite`), podendo dificultar depurações.
3. **Persistência Volátil do Express:** Em hospedagens serverless modernas (ex: Vercel), os arquivos salvos em `/tmp` pelo Express são apagados em cold starts (reciclagem de contêineres).
4. **Delete-and-Insert Destrutivo:** A função `updateEstimate` deleta e reinsere linhas de `estimate_items` na atualização de faturas. Isso pode quebrar constraints se chaves estrangeiras forem referenciadas futuramente.

---

## 11. Resultado dos Comandos Executados
* **`npm install`:** Não executado (respeitando as diretrizes de não alterar dependências).
* **`npm run build:vite`:** Testado. Falhou devido à renomeação dos arquivos de entrada do Vite para `.bak` e `.vite`.
* **`npm run build` (Next.js):** Testado. **Concluído com sucesso**. A compilação Next.js encapsula perfeitamente a SPA, gerando a rota catch-all sem erros.

---

## 12. Recomendação para Fase 1
O próximo passo lógico obrigatório é a **Fase 1 — Plano de Banco e RLS em Arquivos Locais (Sem Aplicar)**. 

### Ações para a Fase 1:
1. Modelar a estrutura relacional das 28 tabelas requeridas para comportar organizações, usuários de organizações, créditos, precificação de leads, estimates, checklists de campo e divisão societária.
2. Planejar políticas RLS rigorosas onde toda consulta SQL utilize `organization_id` ou verificação associada ao `auth.uid()` para impedir acessos entre diferentes empresas.
3. Escrever e expor as migrações SQL em arquivos locais de teste (dentro de `/supabase/migrations/`) sem aplicar no banco de dados de produção do Supabase.

---

## 13. Lista de Arquivos que NÃO Devem ser Alterados sem Cuidado
* [UserContext.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/context/UserContext.tsx): Contém a inicialização crítica de sessão e mapeamento multiempresa. Qualquer quebra impedirá o acesso administrativo.
* [supabase.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/supabase.ts): Inicializa os clientes Supabase isolados. Alterações podem reintroduzir contenção de locks no Safari/Mobile.
* [pdf-generator.ts](file:///c:/Desenvolvimento/SiteIhago/Site/src/lib/pdf-generator.ts): Motor de renderização de PDF complexo; alterações podem quebrar o design ou formatação das tabelas da fatura.
* [App.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/App.tsx): Define todas as rotas da SPA; alterações sem correspondência Next.js podem causar erros 404.

---

## 14. Conclusão
A Fase 0 de Auditoria conclui que o HomeLeadPro possui um frontend espetacular e uma arquitetura híbrida Next.js/SPA sólida e funcional. A equipe de engenharia e os múltiplos agentes de IA agora possuem a telemetria e o mapeamento completos de arquivos, mocks e base de dados para prosseguirem seguros e estruturados em direção ao plano relacional na Fase 1.

---

“Nenhuma alteração foi feita. Este relatório corresponde apenas à Fase 0 — Auditoria Rápida do Estado Atual do HomeLeadPro.”
