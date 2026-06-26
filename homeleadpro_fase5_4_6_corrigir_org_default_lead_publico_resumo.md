# Relatório Fase 5.4.6 — Correção de Organization ID Obrigatório

## 1. Correção no Script de Diagnóstico
O script `008_homeleadpro_diagnostico_fluxo_leads.sql` foi atualizado. A tabela interna do PostgreSQL (`pg_policies`) utiliza a coluna `policyname` e não `polname`. Corrigimos a query para refletir as colunas exatas (`schemaname`, `tablename`, `policyname`, `permissive`, `roles`, `cmd`, `qual`, `with_check`).

## 2. Confirmação do `organization_id` (NOT NULL)
A auditoria cruzada com os testes de inserção confirmou que a tabela `public.leads` foi desenhada estritamente para não aceitar `null` na coluna `organization_id`. Sendo assim, a arquitetura correta exige que leads "públicos" ou "órfãos" fiquem atrelados a uma organização do tipo "Plataforma" ou "Default".

## 3. Organização Default
Encontramos no arquivo `.env` a chave `NEXT_PUBLIC_DEFAULT_ORG_ID`, que contém o valor constante `45689bbf-193b-4ae8-82f4-e32bbe63b6dd`. Este UUID foi eleito como o repositório central para abrigar todos os leads públicos vindos do formulário.

## 4. Atualização da RPC `submit_public_lead` (SQL 007)
A *Stored Procedure* `007_homeleadpro_submit_public_lead_rpc.sql` foi ajustada para:
1. **Não** aceitar o `organization_id` via payload (evitando injeção pelo frontend).
2. Definir e forçar internamente a variável `v_default_org_id = '45689bbf-193b-4ae8-82f4-e32bbe63b6dd'::uuid`.
3. Atrelar o insert inicial e o de fallback a esse UUID.

## 5. Compatibilidade com Lead Market (SQL 006)
A RPC do Lead Market (`006_homeleadpro_buy_lead_rpc.sql`) não sofreu impactos nocivos pois sua lógica de busca de leads disponíveis já utilizava unicamente a âncora `source = 'public' and lower(l.status) = 'new'`. Ela não impõe o requisito de que a org seja nula, garantindo perfeita compatibilidade com leads ancorados na organização default.

## 6. Atualização do Teste ROLLBACK (SQL 008)
O script `008_test_fluxo_public_lead_rollback.sql` foi corrigido. O `insert` manual agora prevê o repasse explícito do `v_default_org_id` no lugar do `null` que causava quebra na restrição. O roteiro ponta a ponta segue testando o `buy_public_lead` com simulação de papéis virtuais.

## 7. Ordem Segura de Aplicação
Para finalizar e validar, aplique as queries no Supabase SQL Editor na seguinte ordem:
1. **008_homeleadpro_diagnostico_fluxo_leads.sql** (Leia os resultados para atestar o estado do banco).
2. **007_homeleadpro_submit_public_lead_rpc.sql** (Aplica o Replace definitivo da RPC com o Default Org e sem `digest`).
3. **008_test_fluxo_public_lead_rollback.sql** (Executa tudo com `ROLLBACK` para aferir a passagem lisa dos dados sem sujar o banco de produção).
4. *(Opcional)* Se não aplicou o **006** antes, aplique-o também.

*(Não foi necessário novo `npm run build` pois não alteramos os artefatos de build do TypeScript)*

---

“A Fase 5.4.6 corrigiu o fluxo de lead público para respeitar organization_id obrigatório usando organização default segura.”
