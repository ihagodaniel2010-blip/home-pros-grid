# Fase 6.3 SQL Review V2

Este relatório formaliza a correção estrutural da proposta `014_homeleadpro_client_payments_receipts.sql` baseada nos critérios de segurança e arquitetura do projeto.

### 1. Correções no Arquivo Principal (014 SQL)
- **Remoção de BEGIN/COMMIT**: O arquivo foi limpo, restando puramente as declarações DDL/DML, preparado para transacionamento via _Supabase SQL Editor_ gerenciado pelo proprietário.
- **Default Seguro para `public_token`**: O campo adquire resiliência já na base de dados garantindo que transações antigas e novos _inserts_ preencham de forma determinística: `DEFAULT gen_random_uuid()::text`.
- **Blindagem da RPC (`get_receipt_by_token`)**:
  - Verifica tokens curtos ou manipulados (`length < 20`).
  - O carimbo de leitura (`viewed_at`) é atualizado cirurgicamente via `coalesce(viewed_at, now())` barrando sobreposições.
  - O output garante total exclusão de identificadores da empresa (`organization_id`), referências financeiras (_expenses_, _ledger_) e ID de funcionários. Retorna somente os limites atrelados ao recibo e a _brand_ da empresa.
  - A RPC agora dispõe das permissões nativas ao público via: `GRANT EXECUTE ON FUNCTION public.get_receipt_by_token(text) TO anon, authenticated`.
- **Revisão Integral RLS**: Foram implementadas as declarações de `DROP POLICY` e recriação do `ENABLE ROW LEVEL SECURITY` com garantias imutáveis para _Super Admin_ e baseada em `get_user_role_in_org` restrita a _owners_ e _admins_. Trabalhadores (_Workers_) e demais _roles_ sofrem negação padrão pelo PostgreSQL.

### 2. Autonomia do Teste Rollback (014 Test Rollback)
- O script `014_test_client_payments_receipts_rollback.sql` passou a ser 100% transacional independente de intervenção humana (fechado entre `BEGIN` e `ROLLBACK`).
- **Passo a Passo Interativo:**
  1. Ele aplica as _Alters_ e a _RPC_ artificialmente em RAM transacional.
  2. Ele simula _logins_ de _Owner_ (comprovando inserções flexíveis `estimate_id` NULL e Válido).
  3. Comprova a invulnerabilidade `UNIQUE` do `public_token` forçando duplicatas (a *Exception* comprova o sucesso).
  4. Comprova a blindagem transversal (_Cross-Tenant_) do _Owner_, que não consegue injetar em orgs concorrentes.
  5. Imita o perfil de um `worker` confirmando interrupções absolutas de leitura (SELECT 0) e escrita.
  6. Finaliza garantindo `viewed_at` ativo pela RPC.
  7. O `ROLLBACK` aniquila o experimento, deixando o ambiente perfeitamente íntegro.
- A tabela `organization_members` foi corretamente descartada em favor do uso canônico de `organization_users`.
