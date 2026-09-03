# Resumo da Fase 9.3.1 — Stripe Sandbox Setup, SQL Review & Test Checkout Validation

**URL de Produção**: [https://www.h-a-construction.com/](https://www.h-a-construction.com/)  
**GitHub Oficial**: [calhasferreirasinop-stack/ha-construction-app](https://github.com/calhasferreirasinop-stack/ha-construction-app)  
**Vercel Oficial**: `calhasferreirasinop-stacks-projects / ha-construction-app`  

---

## 1. Revisão e Refinamento do SQL 020

- **Arquivo Criado**: `supabase/migrations/020_h_a_construction_stripe_credit_topup_REVIEWED.sql`
- **Ajustes de Segurança e Idempotência**:
  - `SET search_path = public;`
  - Validações explícitas de `p_organization_id`, `p_amount > 0` e `p_stripe_session_id`.
  - Índice parcial e checagem de duplicidade por `reference_id` (`p_stripe_session_id`).
  - Retorno JSONB estruturado (`success`, `duplicate`, `ledger_id`, `new_balance`, `message`).
- **Script de Teste de Rollback**: `supabase/migrations/020_test_stripe_credit_topup_REVIEWED_rollback.sql`
  - Simula gravação inicial e tentativa duplicada dentro de uma transação `BEGIN; ... ROLLBACK;`, validando que `duplicate: true` é retornado e nenhum dado permanece no banco.
- **Status do SQL**: **NENHUM SQL FOI APLICADO AO SUPABASE.** Aguarda confirmação formal.

---

## 2. Variáveis de Ambiente Necessárias na Vercel (Sandbox / Test Mode)

Para ativar a criação de sessões no Checkout do Stripe em ambiente de testes:
- `STRIPE_SECRET_KEY` = `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
- `NEXT_PUBLIC_SITE_URL` = `https://www.h-a-construction.com`

---

## 3. Pergunta de Autorização para Aplicação de SQL

> **“SQL 020 revisado está pronto. Posso aplicar no Supabase?”**
