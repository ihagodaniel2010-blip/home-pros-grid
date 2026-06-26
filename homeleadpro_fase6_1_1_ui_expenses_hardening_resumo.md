# Fase 6.1.1 UI: Hardening do Receipt & Expense Center

Este relatório resume os aprimoramentos aplicados na interface `/admin/expenses` para garantir robustez, consistência e preparação prévia para o fluxo de Reimbursements.

### O que foi corrigido e completado

1. **Eficiência e Escopo (`getExpenses`)**
   - O _fetch_ principal de despesas (`lib/expenses.ts`) foi refatorado para exigir e utilizar `organization_id` no `.eq()`. Isso garante filtro explícito desde a chamada, sem depender cegamente apenas do RLS.
2. **Formulário Completo e Guiado**
   - Inseridos todos os campos e seletores faltantes: `paid_by_name`, `tax_category` (opcional). O `status` agora garante ser `active` por padrão.
   - Foram embutidas regras de UX inteligentes.
     - Se `payment_source` for alterado para _owner_personal_ ou _partner_personal_, o toggle `reimbursable_to_owner` liga automaticamente e o status passa para `pending_reimbursement`.
     - Se `expense_category` virar _client_reimbursable_, o toggle `bill_to_client` ativa automaticamente indicando `pending`.
3. **Módulo de Uploads Resiliente**
   - O processo de criação de despesa não é mais interrompido fatalmente caso o envio do anexo falhe.
   - Se o Storage recusar o anexo, a despesa `receipts` ainda é validada e computada (impedindo perda dos dados preenchidos), e o frontend apresenta um `toast.warning` explicando que o arquivo não subiu.
4. **Attach Receipt Post-mortem**
   - Se uma despesa foi criada sem anexo ou o anexo falhou no cadastro, um botão de atalho `Attach Receipt` (`Upload`) substitui o ícone de Download naquela linha. Ele abre um mini-diálogo permitindo subir a nota/foto pontualmente, engatilhando apenas o `uploadReceiptFile`.
5. **Dashboard de Análise e Filtros**
   - Os cartões agora cobrem `Company Exp.` e `Job Materials`.
   - Adicionados novos componentes na _Toolbar_ para filtrar intervalo de datas (`date range`), fonte pagadora (`payment_source`) e status de faturamento para clientes (`client_reimbursement_status`).
6. **Proposta de SQL - Storage Bucket**
   - Foi criado o arquivo passivo `013_storage_receipts_bucket_policies.sql` na pasta supabase. Este documento oficializa as tabelas, RLS e limitação a 10MB do bucket estrito "receipts", deixando o sistema protegido de arquivos corrompidos ou públicos. (Não executado/aplicado; apenas proposta de arquitetura de Storage).

---

### Respostas Solicitadas:

1. **getExpenses filtra organization_id?** Sim, foi ajustado com `.eq("organization_id", organizationId)`.
2. **Campos faltantes foram adicionados?** Sim. Todos (paid_by_name, tax_category, etc) estão no forms.
3. **Toggles reimbursable_to_owner e bill_to_client existem?** Sim, renderizados como `Switch` e com lógicas em `useEffect` para auto-assinalar de acordo com a seleção acima deles.
4. **Filtros completos existem?** Sim, cobrindo inclusive _date range_.
5. **Cards completos existem?** Sim. Os 6 exigidos renderizam em tempo real.
6. **Upload continua sem URL pública?** Sim, totalmente baseado em Signed URLs (via `getReceiptFileUrl`).
7. **Bucket receipts foi confirmado?** Como a validação backend/Supabase API é hermética, foi gerada e fornecida a query formal de `013` caso os acessos do Storage via UI ainda não tenham sido ativados pelo admin na nuvem.
8. **Worker segue bloqueado?** Sim. O `AdminLayout.tsx` permanece protegendo as rotas, além de não expor menus para seu perfil.
9. **Owner/admin conseguem criar despesa sem job?** Sim, usando a opção nativa "No Job".
10. **Owner/admin conseguem criar despesa com job?** Sim, atrelando à ID buscada em tempo real.
11. **Owner/admin conseguem criar despesa com reimbursement pendente?** Sim, o toggle inteligente habilita e expõe esse estado.
12. **Resultado do npm run build:** Sucesso! Terminou sem nenhum erro bloqueante (`Compiled successfully in 25.0s`).
