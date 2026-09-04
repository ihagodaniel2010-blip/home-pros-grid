# Resumo da Fase 9.3.4 — Stripe Ledger External Reference Fix

**Projeto Alvo:** Carpentry (`ozhjvprhhsdglxokfwze` / `https://ozhjvprhhsdglxokfwze.supabase.co`)  
**Data:** 03/09/2026  
**Status:** CONCLUÍDO (Proposta & Validação Local / Zero Alterações Aplicadas no Supabase)

---

## Executive Summary

Durante a auditoria da Fase 9.3.3, confirmou-se que a coluna `reference_id` da tabela `public.organization_credit_ledger` no Supabase pré-existente da H&A Construction é do tipo **`UUID`**, enquanto as sessões de checkout do Stripe utilizam o formato texto (`cs_test_...` / `cs_live_...`).

Como consequência:
1. Ao receber o evento `checkout.session.completed` na Fase 9.3.2, a chamada à RPC `record_stripe_credit_topup` foi rejeitada pelo PostgreSQL com erro de incompatibilidade de tipo (`invalid input syntax for type uuid`).
2. **Nenhum crédito sandbox de $50 foi efetivamente gravado no ledger.**
3. A Migration 021 (reversão auditável) foi **cancelada e marcada como obsoleta**, pois não havia registro a reverter.
4. Para resolver a incompatibilidade sem comprometer chaves estrangeiras legadas (como `lead_id` UUID em `lead_debit`), foi proposta a criação da coluna `external_reference_id TEXT` na Migration 022.

---

## Resumo das Tarefas Executadas

### 1. Auditoria de Impacto no Código
- **`reference_id`:** É utilizado por RPCs internas (como `buy_public_lead`) para armazenar UUIDs de entidades internas (ex: `lead_id` da tabela `lead_distributions`).
- **`external_reference_id`:** Adicionado como `TEXT` para armazenar IDs de terceiros/externos (`cs_test_...`, `cs_live_...`).

### 2. Cancelamento da Migration 021
- [021_reverse_stripe_sandbox_test_credit.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/021_reverse_stripe_sandbox_test_credit.sql) foi atualizado com cabeçalho explícito indicando estado **CANCELED / OBSOLETE**, impedindo qualquer tentativa de execução futura.

### 3. Migration Proposal 022
- **Arquivo:** [022_h_a_construction_ledger_external_reference_id.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/022_h_a_construction_ledger_external_reference_id.sql)
- **Ações Propostas:**
  1. `ALTER TABLE public.organization_credit_ledger ADD COLUMN IF NOT EXISTS external_reference_id TEXT;`
  2. `CREATE INDEX IF NOT EXISTS idx_organization_credit_ledger_external_ref ON public.organization_credit_ledger (reference_type, external_reference_id) WHERE external_reference_id IS NOT NULL;`
  3. Atualização da RPC `public.record_stripe_credit_topup` para:
     - Fazer busca de idempotência em `external_reference_id = TRIM(p_stripe_session_id)`.
     - Inserir `reference_id = NULL` e `external_reference_id = TRIM(p_stripe_session_id)`.
  4. Restrição de segurança: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;`

### 4. Rollback Test Script 022
- **Arquivo:** [022_test_ledger_external_reference_id_rollback.sql](file:///c:/Desenvolvimento/SiteIhago/Site/supabase/migrations/022_test_ledger_external_reference_id_rollback.sql)
- **Escopo:** Executa alterações dentro de bloco `BEGIN ... ROLLBACK;`, validando inserção, leitura, idempotência duplicada e rejeição de entradas inválidas sem deixar resíduos no banco.

---

## Verificação do Build Frontend/Backend

```bash
npx tsc --noEmit -p tsconfig.app.json  # Exit code 0 (PASSED)
npm run build                          # Exit code 0 (PASSED)
```

---

## Checklist de Respostas (16 Pontos)

1. **reference_id é UUID?**  
   **Sim.** A coluna no banco pré-existente é do tipo `UUID`.

2. **Stripe session id cabe em reference_id UUID? Deve ser não.**  
   **Não.** A string `cs_test_...` não é um UUID válido.

3. **Houve crédito Stripe $50 no ledger? Deve ser não.**  
   **Não.** A inserção no ledger falhou no nível do PostgreSQL.

4. **SQL 021 foi cancelado?**  
   **Sim.** Marcado como `CANCELED / OBSOLETE`.

5. **Por que não alterar reference_id para TEXT agora?**  
   Para evitar efeitos colaterais em índices e referências a entidades internas que dependem do tipo `UUID`.

6. **external_reference_id TEXT foi proposto?**  
   **Sim.** Proposto na Migration 022.

7. **SQL 022 foi criado?**  
   **Sim.** Criado em `supabase/migrations/022_h_a_construction_ledger_external_reference_id.sql`.

8. **Rollback test 022 foi criado?**  
   **Sim.** Criado em `supabase/migrations/022_test_ledger_external_reference_id_rollback.sql`.

9. **A nova RPC usa external_reference_id?**  
   **Sim.** Utiliza para verificação de idempotência e gravação.

10. **A nova RPC mantém reference_id NULL para Stripe?**  
    **Sim.** `reference_id` é gravado como `NULL`.

11. **A idempotência usa reference_type + external_reference_id?**  
    **Sim.** Verificação estrita por combinação dos dois campos.

12. **Algum SQL foi aplicado? Deve ser não.**  
    **Não.** Nenhuma alteração foi executada no Supabase.

13. **Algum dado foi alterado? Deve ser não.**  
    **Não.** Zero dados foram alterados.

14. **CalhaFlow foi tocado? Deve ser não.**  
    **Não.** Ambiente CalhaFlow intocado.

15. **npx tsc passou?**  
    **Sim.** Compilado com sucesso (Exit Code 0).

16. **npm run build passou?**  
    **Sim.** Build estático compilado com sucesso (Exit Code 0).
