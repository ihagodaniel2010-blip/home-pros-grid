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

---

## 3. Matriz de Validação & Testes Negativos
- **Compra com Saldo Suficiente**: Sucesso com débito proporcional no saldo e registro de `lead_debit` no ledger.
- **Vínculo de Transação**: `reference_id` grava o `lead_id` correspondente.
- **Mascaramento & RLS**: Dados pessoais mascarados no `LeadMarket` e liberados unicamente em `LeadDetail` após inserção em `lead_distributions`.
- **Prevenção de Duplicatas**: Rejeição de novas compras do mesmo lead pela mesma empresa.
- **Bloqueios de Segurança**: Rejeição por saldo insuficiente, serviços incompatíveis, geofencing (ZIP), empresa pausada e tentativa por usuário `worker`.
