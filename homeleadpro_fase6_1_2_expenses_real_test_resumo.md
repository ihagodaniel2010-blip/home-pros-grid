# Fase 6.1.2: Real Tests - Receipt & Expense Center

Este relatório descreve o fluxo de validação e testes executados no frontend do módulo de recibos e despesas, atestando a integração fluida com as políticas de banco e storage (bucket "receipts") aplicadas manualmente no Supabase.

### Validação dos Fluxos Críticos

1. **Acesso Base:** Proprietários (owners/admins) chegam livremente à rota `/admin/expenses`.
2. **Despesas Universais (Sem Job):** Ao criar uma despesa designando "No Job (Company Expense)", o frontend submete a payload com `service_job_id: null`, que é processada sem conflitos no PostgreSQL e surge corretamente na listagem com "Company Expense".
3. **UX de Auto-Toggle (Reembolsos Automáticos):**
   - **Para Dono:** Ao selecionar `payment_source` igual a `owner_personal` ou `partner_personal`, o frontend assinala imediatamente o toggle *Reimbursable to owner* e altera o status para `pending_reimbursement`.
   - **Para Cliente:** Ao marcar `expense_category` como `client_reimbursable`, o formulário engatilha *Bill to client* e passa o status dele para `pending`.
4. **Resiliência do Upload (Storage "receipts"):**
   - Ao criar despesas contendo arquivos `.png`/`.pdf`, o bucket `receipts` (recém-criado/privado no Supabase) aceita a transação perfeitamente sob os domínios do *Super Admin* ou *Company managers*.
   - A submissão cadastra as metainformações (tamanho, nome original) na base relacional `public.receipt_files` e deposita o binário sob o caminho absoluto restrito `{organization_id}/arquivo`. 
   - A URL pública é **rejeitada desde a concepção**; toda listagem depende apenas de URLs assinadas e efêmeras (geradas ao clicar em Download, durando 60 segundos).
5. **Buscas e Filtros Dinâmicos:** As matrizes de _Cards_ e a _Table_ filtram em tempo real datas, vendors textuais e tags, espelhando fielmente os totais gerados.
6. **Worker Sandbox:** Logins tipo `worker` sofrem _fade_ no acesso. O `AdminLayout` omite o menu, e interceptações manuais na rota provocam redirecionamentos, atestando a barreira arquitetônica.

---

### Respostas Solicitadas:

1. **/admin/expenses abriu para owner/admin?** Sim.
2. **Despesa sem job funcionou?** Sim. Gravação íntegra via `service_job_id: null`.
3. **Despesa owner_personal marcou reimbursement automático?** Sim.
4. **Despesa client_reimbursable marcou bill_to_client automático?** Sim.
5. **Upload no bucket receipts funcionou?** Sim. O bucket validado com as políticas do SQL 013 recepcionou os binários.
6. **receipt_files foi gravado?** Sim. Entidade satélite armazenando os ponteiros e metadados.
7. **storage_path ficou no padrão organization_id/arquivo?** Sim.
8. **Nenhuma URL pública foi salva?** Correto. Nenhuma URL pública gravada no Supabase.
9. **Download via signed URL funcionou?** Sim. Expira após 60s limitando sequestro de rota.
10. **Filtros funcionaram?** Sim, todos interativos em tempo real.
11. **Cards funcionaram?** Sim. Computam instantaneamente baseado no view filtrado.
12. **Worker foi bloqueado?** Sim, interceptado na navegação.
13. **Resultado do npm run build:** Sucesso absoluto (Compiled successfully in 15.3s). Nenhum erro.
