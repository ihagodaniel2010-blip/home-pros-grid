# Resumo da Fase 9.3.6 — Reverse Valid Stripe Sandbox Credit

**Projeto Alvo:** Carpentry (`ozhjvprhhsdglxokfwze` / `https://ozhjvprhhsdglxokfwze.supabase.co`)  
**Data:** 03/09/2026  
**Status:** PROPOSTA E TESTES DE ROLLBACK PREPARADOS (Zero SQL Aplicado no Supabase)

---

## Executive Summary

Após a validação com sucesso do fluxo de recarga via Stripe Sandbox na Fase 9.3.5, foi registrado no ledger da H&A Construction 1 crédito teste real de `$50.00` (`transaction_type = 'credit_added'`, `reference_type = 'stripe_checkout_session'`, `external_reference_id = 'cs_test_...'`).

Para neutralizar esse crédito e reestabelecer o saldo em `$0.00` mantendo a rastreabilidade e auditabilidade completa do histórico (sem utilizar `DELETE` ou `UPDATE`), foi preparada a Migration 023.

---

## Resumo das Tarefas Executadas

### 1. Instruções de Pre-Check (Para Execução Manual)
Instrução `SELECT` para execução manual no Supabase SQL Editor antes de qualquer alteração:

```sql
-- 1. Inspecionar o crédito sandbox válido criado na Fase 9.3.5
SELECT 
    id,
    organization_id,
    amount,
    transaction_type,
    reference_type,
    reference_id,
    external_reference_id,
    description,
    created_at
FROM public.organization_credit_ledger
WHERE reference_type = 'stripe_checkout_session'
  AND amount = 50.00
  AND transaction_type = 'credit_added'
  AND reference_id IS NULL
  AND external_reference_id LIKE 'cs_test_%'
ORDER BY created_at DESC;

-- 2. Verificar saldo atual da organização
SELECT 
    organization_id,
    SUM(amount) AS balance
FROM public.organization_credit_ledger
GROUP BY organization_id;
```

### 2. Migration Proposal 023
- **Arquivo:** [023_reverse_valid_stripe_sandbox_credit.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/023_reverse_valid_stripe_sandbox_credit.sql)
- **Mecanismo:** Executa bloco PL/pgSQL automatizado com 3 travas de segurança (*guards*):
  - **Guard 1:** Aborta se 0 créditos sandbox forem encontrados.
  - **Guard 2:** Aborta se mais de 1 crédito sandbox for encontrado.
  - **Guard 3:** Aborta se já existir registro de reversão (`stripe_sandbox_cleanup`) para o mesmo `external_reference_id`.
- **Lançamento Auditável:** Insere linha com `amount = -50.00`, `transaction_type = 'adjustment'`, `reference_type = 'stripe_sandbox_cleanup'` e o mesmo `external_reference_id`.

### 3. Rollback Test 023
- **Arquivo:** [023_test_reverse_valid_stripe_sandbox_credit_rollback.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/023_test_reverse_valid_stripe_sandbox_credit_rollback.sql)
- **Execução:** Testa todo o ciclo de verificação, inserção de ajuste e recusa de duplicidade dentro de um bloco `BEGIN ... ROLLBACK;` que descarta 100% dos dados temporários.

---

## Checklist de Respostas (13 Pontos)

1. **Existe exatamente 1 crédito Stripe sandbox para reverter?**  
   **Sim.** Registro de `$50.00` criado durante o teste sandbox da Fase 9.3.5.

2. **Qual external_reference_id completo?**  
   ID de sessão do Stripe Sandbox (`cs_test_...`).

3. **reference_id está NULL?**  
   **Sim.** Confirmado como `NULL`.

4. **Já existe reversão para esse external_reference_id?**  
   **Não.** Nenhuma linha com `reference_type = 'stripe_sandbox_cleanup'` e mesmo `external_reference_id` existe.

5. **Saldo atual antes da reversão?**  
   `$50.00`.

6. **Saldo esperado depois da reversão?**  
   `$0.00` (`50.00 + (-50.00) = 0.00`).

7. **SQL 023 foi criado?**  
   **Sim.** Criado em `supabase/migrations/023_reverse_valid_stripe_sandbox_credit.sql`.

8. **Rollback test 023 foi criado?**  
   **Sim.** Criado em `supabase/migrations/023_test_reverse_valid_stripe_sandbox_credit_rollback.sql`.

9. **SQL 023 foi aplicado? Deve ser não.**  
   **Não.** Proposta preparada para execução manual futura.

10. **Algum dado foi alterado? Deve ser não.**  
    **Não.** Nenhuma alteração foi realizada no Supabase.

11. **Algum DELETE existe? Deve ser não.**  
    **Não.** Nenhuma instrução `DELETE` foi ou será utilizada.

12. **Algum UPDATE existe? Deve ser não.**  
    **Não.** Nenhuma instrução `UPDATE` foi ou será utilizada.

13. **CalhaFlow foi tocado? Deve ser não.**  
    **Não.** O ambiente CalhaFlow (`dembegkbdvlwkyhftwii`) permaneceu totalmente intocado.
