# Fase 8.4 — Lead Purchase, Credits Ledger & Manual Lead Acquisition

## 1. Visão Geral
A Fase 8.4 auditou e validou o fluxo de compra manual de leads, controle de saldo e histórico de lançamentos contábeis (ledger) para a H&A Construction.

---

## 2. Fluxo da Transação de Compra
- **Interface Pública**: Ação disparada pelo botão "Buy Lead" em `/admin/leads` ([LeadMarket.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/LeadMarket.tsx)).
- **Execução Segura via RPC (`buy_public_lead`)**:
  - Resolução da organização através do token de autenticação (`auth.uid()`).
  - Bloqueio imediato para perfil `worker`.
  - Validação de saldo disponível antes do débito (`v_current_balance >= v_base_price`).
  - Proteção contra compras duplicadas do mesmo lead pela mesma empresa (`lead_distributions`).
  - Inclusão do débito contábil em `organization_credit_ledger` com vínculo ao `lead_id` (`reference_id`).
  - Liberação de acesso aos dados completos do lead no painel após a confirmação da distribuição.
