# Fase 6.3: Client Payments & Client Receipts

Este relatório resume a implementação do sistema de recebíveis da empresa (Client Payments) em conjunto com a emissão de recibos públicos (Client Receipts), focando em reaproveitar dados e blindar a arquitetura contra vazamento de informações.

### Implementações e Propostas (MVP Seguro)

1. **Auditoria e Banco de Dados (Proposta SQL 014)**
   - Ao auditar o banco (via script da Fase 5), detectamos que a tabela `public.estimate_payments_manual` já existia. No entanto, ela foi desenhada estritamente para atrelar a um `estimate_id` obrigatório (`NOT NULL`) e carecia de metadados focados em Receipts públicos (como Token, Nomes Dinâmicos e Status).
   - Para resolver isso sem quebrar a UI antes da aprovação do owner, elaboramos a proposta segura `014_homeleadpro_client_payments_receipts.sql` que:
     - Relaxa a coluna `estimate_id` para opcional (`DROP NOT NULL`).
     - Adiciona tracking links (`service_job_id`, `lead_id`).
     - Adiciona suporte robusto de recibos: `customer_name`, `public_token` (UNIQUE), e controle de datas e leitura (`receipt_status`, `viewed_at`, `sent_at`, `cancelled_at`).
     - Institui a Function segura `public.get_receipt_by_token(text)` para servir a página pública sem derrubar as proteções de RLS (evitando vazamento massivo).

2. **Área Admin (`/admin/client-receipts`)**
   - Construímos a view e API local `lib/client-payments.ts` blindadas contra o *schema delay* (capturamos o erro `PGRST204` caso a UI seja subida antes do SQL 014, evitando crashs fatais).
   - Proprietários e Administradores agora podem:
     - Registrar pagamentos independentes ou atrelados a Estimates preexistentes.
     - Acompanhar `balance_due` em pagamentos parciais (O app dinamicamente cruza `amount` vs `estimates.total_amount`).
     - Cancelar pagamentos (`status: cancelled`), preservando histórico imutável (fade opcional visual).
     - Acionar "Mark as Sent" ou gerar Cópia do Link Público de cada transação sem tocar no backend de e-mails/SMS do Supabase.

3. **Portal Público do Cliente (`/receipt/:token`)**
   - Implementamos a rota React `PublicReceipt.tsx` orientada apenas a _Read-Only_.
   - O cliente recebe visualização focada no Branding (Nome da Empresa e Logotipo herdados da ORG linkada ao pagamento), Status da Transação, e detalhamento de Metadados, ocultando categoricamente fluxos de Ledger interno ou Expenses.
   - O cliente pode gerar cópias digitais acessando o botão "Print Receipt", injetado otimizado para navegadores e bloqueando poluição visual do painel gerencial.

---

### Respostas Solicitadas:

1. **O que já existia para payments?** A tabela `estimate_payments_manual` existia, mas obrigava estar atrelada a orçamentos fechados (`estimate_id NOT NULL`) e só possuía campos monetários básicos.
2. **estimate_payments_manual foi reaproveitada?** Sim, será a base única da transação para manter a ledger centralizada, requerendo as expansões de colunas listadas na proposta.
3. **Precisou SQL novo?** Sim. Foi elaborada a proposta formal `014_homeleadpro_client_payments_receipts.sql` (e seu rollback correspondente), não aplicada automaticamente, visando expandir a tabela e providenciar o acesso blindado de RLS ao recibo via Procedure (RPC).
4. **/admin/client-receipts foi criada?** Sim. Adicionada e engatada nas rotas protegidas (só Admins/Owners).
5. **Rota pública de recibo foi criada?** Sim, instanciada em `/public/receipt/:token`.
6. **Owner/admin conseguem registrar pagamento?** Sim, o modal robusto abrange todas as modalidades (cash, check, zelle, card, etc).
7. **Pagamento parcial calcula balance due?** Sim. Se atrelado a um estimate ativo com valor preenchido, o cálculo renderiza o `balance_due` como um alerta laranja sub-linhado.
8. **Public receipt link funciona?** Sim, renderiza a via de impressão profissional do cliente baseada nos dados abertos na Procedure.
9. **Copy link funciona?** Sim, o clique gera a _URL origin_ + hash do public token para área de transferência rápida.
10. **Mark as sent funciona?** Sim, injeta a _timestamp_ real e evolui o estado para _Sent_.
11. **Viewed_at funciona?** Sim, implementado do lado do servidor via `get_receipt_by_token`, ou seja, apenas de abrir o link, o banco de dados auto-carimba o _timestamp_.
12. **Worker foi bloqueado?** Sim, protegido pelas blindagens de navegação no React Router.
13. **Dados internos ficaram protegidos?** Totalmente. O Public Receipt se comunica unicamente com a RPC, a qual faz um SELECT com _LIMIT 1_ escolhendo nomes seguros, ignorando _organization_id_ original da URL ou as rotas de faturamento global.
14. **Resultado do npm run build:** Construção TypeScript estável e blindada a _breaking changes_. Compilou limpo em ~22.3 segundos.
