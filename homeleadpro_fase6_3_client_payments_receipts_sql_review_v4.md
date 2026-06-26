# Fase 6.3 SQL Review V4

Este relatório consolida a versão final (V4) das propostas DDL para pagamentos de clientes (Client Payments) e o respectivo recibo público.

### 1. Correções do Schema
- **Remoção de Referências Inexistentes**: O script `014` foi ajustado para remover `org.logo_url` da resposta da RPC pública (`get_receipt_by_token`), visto que a coluna física ainda não existe na tabela `public.organizations` nesta fase de projeto.
- **Resiliência do Frontend**: O componente `PublicReceipt.tsx` já lida comântica e graciosamente com a ausência de logomarcas, baseando-se no `company_name` via um _fallback visual_ seguro (A primeira letra como avatar).

### 2. Integridade Consolidada
Todas as correções implementadas nas versões anteriores foram mantidas na V4:
- O banco preenche retroativamente `public_token` em faturas prévias (`UPDATE ... IS NULL`).
- As transações antigas e o UUID Default permitem à tabela suportar em estabilidade o `CREATE UNIQUE INDEX`.
- A RPC revoga acessos globais para conceder especificamente a `anon` e `authenticated`.
- Dados cruciais restritos ao faturamento não vazam ao `anon` (Sem `estimate_id`, `service_job_id` ou identificadores `organization_id`).
- Workers (`worker`) estão absolutamente bloqueados contra `estimate_payments_manual` via políticas de `Row-Level Security` explícitas, exigindo permissões de `owner/admin` ou de `is_super_admin()`.

O pacote final SQL V4, isolado e autônomo, está validado transacionalmente e limpo para deploy pela via de escolha do time administrativo.
