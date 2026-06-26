# Relatório Fase 5.4.9 — Teste Rollback Autossuficiente

## 1. Funções Recriadas em Tempo de Execução
O script `008_test_fluxo_public_lead_rollback.sql` foi reestruturado para ser completamente independente e imune ao histórico salvo no banco. Dentro do bloco transacional (`BEGIN;`), ele agora força o `CREATE OR REPLACE FUNCTION` das quatro funções cruciais:
1. `generate_public_token` (Removida a dependência de `digest()`).
2. `submit_public_lead` (Forçando o `v_default_org_id` constante).
3. `get_public_available_leads` (Com a blindagem e os aliases em `public.organization_users ou`).
4. `buy_public_lead` (Também com aliases blindados em `ou` e `l`).

## 2. Isolamento do Teste
Com essas declarações antecipadas, a função *antiga* (`get_public_available_leads`) contendo o erro `status is ambiguous` — que havia sido criada em testes anteriores no Supabase — **não será mais invocada**. O teste passará a utilizar exatamente a versão corrigida que habita a mesma transação atual.

## 3. Segurança via ROLLBACK
O script continua sendo encerrado estritamente com `ROLLBACK;`. Isso garante que as definições corrigidas (`CREATE OR REPLACE`) e os leads de teste injetados desaparecerão assim que o teste acabar, mantendo o banco intacto e provando o funcionamento da lógica.

## 4. Próximos Passos
1. Execute todo o conteúdo de `008_test_fluxo_public_lead_rollback.sql` no Supabase SQL Editor.
2. Confirmando que o teste agora passa sem o erro `ambiguous` ou falhas de constraint de nulo, o caminho estará livre e 100% testado.
3. Nesse momento, deve-se aplicar o **SQL 006** e **SQL 007** separadamente para que o `COMMIT` definitivo ocorra.

---

“O teste 008 agora é autossuficiente e recria as funções corrigidas antes de validar o fluxo com ROLLBACK.”
