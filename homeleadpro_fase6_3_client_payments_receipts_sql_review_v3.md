# Fase 6.3 SQL Review V3

Este relatório consolida a versão V3 das propostas DDL para estabilizar pagamentos de clientes (Client Payments) em conformidade com as regras de *hardening* do projeto Barrigudo.

### 1. Reforços Direcionados no SQL Principal (V3)
- **Criação Explícita de Índice `UNIQUE`**: A coluna `public_token` agora é indexada e verificada de forma irrevogável pelo PostgreSQL através de `CREATE UNIQUE INDEX ... WHERE public_token IS NOT NULL`.
- **Prevenção de Superexposição na Função RPC**: A função `public.get_receipt_by_token(text)` não retorna mais `estimate_id` e `service_job_id`. O retorno estrito ao cliente final exibe apenas chaves inócuas (`receipt_number` mapeado de `epm.id`, `amount`, `method`, `customer_name`, e logo/nome da empresa).
- **Limpeza de Direitos de Execução**: Antes da declaração final de `GRANT`, aplicamos profilaticamente `REVOKE ALL ON FUNCTION ... FROM PUBLIC` garantindo que o PostgreSQL desfaça as regras legadas padrão, entregando estritamente `TO anon, authenticated`.

### 2. Aprimoramento do Teste de Rollback Transacional
- O script providenciou testes interativos para RLS avaliando o comportamento dinâmico de `Row-Level Security`.
- As exceções agora cobrem graciosamente a duplicidade de restrições de ambiente do Supabase ao processar infrações de RLS (`insufficient_privilege`, `check_violation`, e o *fallback* via filtro `SQLERRM ILIKE '%row-level security%'`), barrando *Cross-Tenant* sem crashes silenciosos do teste.

### 3. Atestado de RLS vs. Workers
- Importante salientar: o teste de RLS de um *worker* injetado artificialmente por `set_config` no *SQL Editor* é puramente **auxiliar**. Ele avalia se as políticas base da tabela rejeitam acessos ilegais, porém **o teste definitivo de worker deve ser obrigatoriamente validado efetuando login real na aplicação web**, garantindo que não existam *bypass* no cliente. A Fase 6.3 se compromete a proibir que *workers* interajam com esta camada, tanto em nível de roteamento SPA quanto nas invocações REST do Supabase.
