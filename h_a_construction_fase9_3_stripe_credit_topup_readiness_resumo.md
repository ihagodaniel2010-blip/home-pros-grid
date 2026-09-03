# Resumo da Fase 9.3 — Stripe Credit Top-Up & Subscription Readiness

**URL de Produção**: [https://www.h-a-construction.com/](https://www.h-a-construction.com/)  
**GitHub Oficial**: [calhasferreirasinop-stack/ha-construction-app](https://github.com/calhasferreirasinop-stack/ha-construction-app)  
**Vercel Oficial**: `calhasferreirasinop-stacks-projects / ha-construction-app`  

---

## 1. Pacotes de Crédito Definidos (Modo Teste / Sandbox)

- `$50 Credits` (50 créditos)
- `$100 Credits` (100 créditos — *Most Popular*)
- `$250 Credits` (250 créditos)
- `$500 Credits` (500 créditos — *Best Value*)

*Valores customizados arbitrários são estritamente rejeitados na API.*

---

## 2. Endpoints Server-Side Criados (`server/index.js`)

- `GET /api/billing/stripe-status`: Retorna o status de configuração do Stripe em modo teste sem expor a chave secreta.
- `POST /api/billing/create-checkout-session`: Cria sessões de Checkout da API do Stripe com validação de pacotes e bloqueio de função `worker`.
- `POST /api/stripe/webhook`: Endpoint seguro com verificação de assinatura `stripe-signature` para recebimento idempotente de eventos `checkout.session.completed`.

---

## 3. Proposta de Migração SQL (Não Aplicada)

- `supabase/migrations/020_h_a_construction_stripe_credit_topup.sql`: Proposta de função RPC `record_stripe_credit_topup` com índice e checagem de idempotência por `reference_id` (`stripe_session_id`).
- `supabase/migrations/020_test_stripe_credit_topup_rollback.sql`: Script de teste para reversão da migration.

---
