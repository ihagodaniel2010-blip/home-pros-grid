# Fase 6.1 UI: Receipt & Expense Center

## Resumo das Entregas

Nesta fase foi desenvolvida a UI que conecta o front-end ao módulo "Receipt & Expense Center" (estruturado no Supabase durante a fase 6.1 do banco de dados). Tudo está rodando no caminho base já estabelecido sem alterar a arquitetura do banco ou o "CalhaFlow".

### 1. Tela e Menu
- **Rota Adicionada:** Criada e habilitada a rota de React `/admin/expenses`.
- **Menu de Navegação:** Item `Receipts & Expenses` adicionado na `AdminLayout`. A navegação foi ajustada para ocultar as partes financeiras quando o worker se loga.
- **Bloqueio Automático:** A segurança da `AdminLayout` foi reforçada. Se um worker interceptar a navegação e tentar forçar um redirecionamento direto para a tela, o sistema reconhecerá que não faz parte das rotas permitidas e o redirecionará de volta ao painel de início do worker.

### 2. Acesso e Integração a Dados
- **Library (`lib/expenses.ts`):** Criados os métodos CRUD unificados que conectam diretamente às tabelas `receipts` e `receipt_files` mantendo as tipagens alinhadas aos `enums` do PostgreSQL (`expense_category`, `payment_method`, `payment_source`, `client_reimbursement_status`, `status`, etc.).
- **Integração de Jobs:** Um exportador `getServiceJobs` foi ajustado na `lib/service-jobs.ts` para captar os serviços ativos da organização e permitir a indexação durante o lançamento de uma nova despesa.

### 3. Funcionalidades de MVP
A interface do `Expenses.tsx` abrange todos os cenários solicitados no checklist:
- **Painel de Resumo (Cards):** Renderiza o total gasto no mês, a soma de gastos feitos por vias pessoais, gastos a faturar do cliente (Bill to Client), e montantes pendentes de reembolso ao dono (Pending Reimbursement).
- **Lista/Tabela de Despesas:** Listagem organizada que demonstra Data, Fornecedor (com ícone indicando existência de recibos anexados), ID de Serviço (se vinculado), Categoria, Origem de Pagamento, Total e Status atual.
- **Filtros e Buscas:** Os totais e listas reagem diretamente aos inputs de busca textual de fornecedor e menus dropdown de categorias.
- **Formulário Modular:** Suporta perfeitamente:
  - Adição sem vínculo a job (`service_job_id` opcional).
  - Adição com vínculo a job (se selecionado, a `service_job_id` vira payload ativo).
  - Tipagem exaustiva de origens e métodos para garantir a integridade do "Tax Year".
- **Sistema de Arquivos Seguro:** Upload integrado ao formulário subindo a imagem diretamente ao bucket restrito de "receipts" (`Storage`). 
  - Cria-se a entidade satélite em `receipt_files` ao mesmo tempo que finaliza-se a inserção da transação principal, respeitando metadados privados (tamanho de bucket e `file_size` bigint).
  - A visualização é feita puramente com geração dinâmica (temporária) de **Signed URL** ao clicar em "Download", e a interface se abstém por completo de trafegar a URL pública em colunas diretas da `receipts`.
- **Ações Imediatas:** Despesas podem ser invalidadas/canceladas. Um clique no "Void" fará com que o status no Supabase vá para "voided" (refletindo-se no front-end por via de opacidade reduzida/estilo condicional).

### 4. Build 
Um erro de exportação inicial em `getServiceJobs` provocado pela ausência do método necessário para buscar a lista de Jobs nas _options_ do formulário foi resolvido em tempo de validação. Após esse adendo rápido no arquivo de apoio `service-jobs.ts`, o build de produção final passou suavemente em ~26 segundos, permitindo a finalização dos processos.

---

### Checagem Final das Solicitações:

1. **Tela /admin/expenses criada?** Sim.
2. **Menu criado?** Sim, foi ajustado no layout administrador.
3. **Worker bloqueado?** Sim. Não recebe links pelo menu e a interceptação de URL corta o acesso. Além disso, pelo RLS da etapa anterior, sua visibilidade dos registros é zero.
4. **Owner/admin conseguem listar despesas?** Sim, lista renderiza condicionalmente ao `fetchData`.
5. **Owner/admin conseguem criar despesa sem job?** Sim (opção "No Job / Company Expense" padrão no `service_job_id`).
6. **Owner/admin conseguem criar despesa com job opcional?** Sim (com busca das instâncias ativas do respectivo org_id).
7. **Upload grava `receipt_files`?** Sim, a biblioteca faz a transação local acoplando perfeitamente.
8. **Nenhuma URL pública é salva?** Certo, os `storage_path` são mantidos em colunas privadas em `receipt_files`.
9. **Signed URL temporária foi usada?** Sim, o botão "Download" na listagem requisita `createSignedUrl` ao bucket com vida útil de 60s antes de engatilhar o carregamento da imagem ao dono.
10. **Filtros e cards funcionam?** Sim, reagem instantaneamente (state-driven filter) sobre a lista principal sem necessitar _refresh_ contínuo e exaustão do _fetch_.
11. **Resultado do build:** Sucesso. (Nenhum bug remanescente).
