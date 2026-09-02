# Fase 7.1 — Public Marketing Site Audit & Improvement Plan

## 1. Visão Geral
A Fase 7.1 realizou a auditoria completa do site público, das rotas abertas, do branding, da tabela de preços, da responsividade mobile, da segurança e do SEO do **HomeLeadPro / Barrigudo**.

---

## 2. Rotas Públicas Mapeadas
As seguintes rotas públicas foram identificadas na aplicação:

1. `/` (`src/pages-spa/Index.tsx`) — Página Inicial (Hero, Top Projects, Projects List, Articles).
2. `/services` (`src/pages-spa/Services.tsx`) — Catálogo de Serviços de Construção/Reformas.
3. `/quote/:serviceSlug` (`src/pages-spa/Quote.tsx`) — Fluxo de Solicitação de Orçamento por Proprietários de Imóveis.
4. `/success` (`src/pages-spa/Success.tsx`) — Tela de confirmação após solicitação de orçamento.
5. `/login` (`src/pages-spa/Login.tsx`) — Tela de login de Usuários / Prestadores.
6. `/join` (`src/pages-spa/Join.tsx`) — Página de cadastro para Profissionais ("Join as a Pro").
7. `/about` (`src/pages-spa/About.tsx`) — Página Institucional "About Us".
8. `/blog` (`src/pages-spa/Blog.tsx`) — Seção de Blog e Artigos.
9. `/cost-guide` (`src/pages-spa/CostGuide.tsx`) — Portfólio de Obras e Guia de Custos.
10. `/experiences` (`src/pages-spa/Experiences.tsx`) — Avaliações e Depoimentos de Clientes.
11. `/admin/login` (`src/pages-spa/admin/AdminLogin.tsx`) — Portal de Acesso do Administrador / Empreiteiro.
12. `/estimate/:token` (`src/pages-spa/PublicView.tsx`) — Visualização pública e aprovação de Orçamentos via Token.
13. `/extra/:token` (`src/pages-spa/PublicExtraView.tsx`) — Visualização pública de Aditivos de Orçamentos via Token.
14. `/public/receipt/:token` (`src/pages-spa/public/PublicReceipt.tsx`) — Componente de Recibo Público *(Nota: O componente existe e é vinculado no ClientReceipts, porém a rota `<Route path="/public/receipt/:token" element={<PublicReceipt />} />` precisa ser registrada em `App.tsx` na Fase 7.2)*.

---

## 3. Análise de Branding e Inconsistências
- **Barrigudo**: É o nome fantasia utilizado na vitrine pública (`Header.tsx`, `About.tsx`, `Login.tsx`, `Join.tsx`, `brand.ts`, `site.ts`, `layout.tsx`).
- **HomeLeadPro**: É a marca do produto SaaS utilizada na documentação, no login dev/admin (`owner-a@homeleadpro.com`) e nas tabelas/migrations do Supabase.
- **CalhaFlow / Ferreira SaaS**: **Nenhuma ocorrência encontrada no código fonte sob `src/`**.
- **Recomendação**: Para o mercado dos EUA, padronizar a identidade pública de marketing em **HomeLeadPro** (ou marca comercial definida para os EUA) e remover o termo "Barrigudo" do frontend público.

---

## 4. Análise de Pricing e Moeda
- **Status do Pricing**: Atualmente **não existe uma página ou seção de preços pública (ex.: `/pricing`)** no frontend.
- **Moeda e Mercado**:
  - A aplicação HomeLeadPro está configurada para o mercado norte-americano (Zip Codes de 5 dígitos, estados americanos, valores em `$ USD`, serviços típicos de construção nos EUA como *Roofing*, *Decks*, *Remodeling*).
  - Preços em Reais (R$) não fazem sentido para este produto. Na Fase 7.2, será criada a landing page de pricing pública com valores em **$ USD** (ex: $29/mo, $79/mo).

---

## 5. Mobile, UX e Conversão
- **Hero & Search**: Design responsivo com TailwindCSS. No mobile, os botões do formulário de busca no Hero empilham verticalmente de forma rústica.
- **Página de Cadastro de Pros (`/join`)**: Atualmente é uma página simples (placeholder) sem exibição de planos de assinatura ou checkout.
- **Proposta de Valor**: A Home atual foca no proprietário de imóvel buscando profissionais, mas não vende claramente a plataforma SaaS para as empresas de construção (como o construtor gerencia orçamentos, recibos, despesas e impostos).

---

## 6. SEO, Metadados e Segurança
- **SEO Básico**:
  - `src/app/layout.tsx` possui `title: "Barrigudo - Professional Home Services"` e `description`.
  - `public/robots.txt` configurado permitindo indexação.
  - Faltam meta tags OpenGraph, Twitter Cards e arquivo `sitemap.xml`.
- **Segurança e Privacidade**:
  - As páginas públicas `/estimate/:token` e `/public/receipt/:token` exigem token único de 64 caracteres.
  - **Nenhuma chave sensível (`service_role`), org_id privado ou dado interno de faturamento é exposto publicamente**.

---

## 7. Verificação de Código & Build
- `npx tsc --noEmit -p tsconfig.app.json` — **Aprovado sem erros**.
- `npm run build` — **Aprovado sem erros (Next.js production build estático verificado)**.
- Nenhum SQL foi aplicado.
- Nenhuma dependência foi adicionada.
- `package.json` e `package-lock.json` permaneceram inalterados.
