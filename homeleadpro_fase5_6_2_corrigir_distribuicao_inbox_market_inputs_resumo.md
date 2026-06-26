# Resumo da Fase 5.6.2 - Correção de Distribuição e Lead Market

1. **Por que Empresa A não recebeu mesmo tendo $40?**
   Ocorreu um descasamento de rota/slug no momento do orçamento (`Quote.tsx`). O formulário enviou a categoria como `drywall` na URL, porém no banco o slug esperado era `drywall-plaster`. Sem mapear a categoria, não encontrou as perguntas, não pôde deduzir a `task_id` da resposta e submeteu o lead com `task_slug = null`. A RPC não auto-distribui um lead com task ausente.
2. **Qual critério falhou?**
   Foi a ausência do `service_task_id`. A regra atual diz "só distribui se houver uma task identificada". Por este motivo a query que varre as empresas por ZIP e saldo sequer foi engatilhada.
3. **A RPC agora retorna `skipped_reasons`?**
   Sim. Refatoramos a RPC localmente `submit_public_lead` em um loop robusto. Cada tentativa frustrada gera um array `skipped_reasons` (`insufficient_balance`, `no_zip_match`, `paused`...) em log para fácil debug, e o lead não é perdido.
4. **`get_my_organization_leads` foi criado?**
   Sim. Uma nova view na base do Supabase usa `auth.uid()` para puxar o `organization_id` seguro e devolve um misto da tabela original (`organization_id` logado) unida com a tabela vinculada `lead_distributions`.
5. **Inbox/Leads agora busca por `lead_distributions`?**
   Sim, graças à nova função RPC, Leads/Inbox não dependerão da atribuição primária incorreta.
6. **Lead Market foi filtrado por task/ZIP/saldo?**
   Sim. A RPC de listagem pública `get_public_available_leads` agora cruza com `company_service_areas` e `company_services` da sessão logada. Leads de outros cantos ficam completamente ocultos.
7. **Empresa B com $5 foi bloqueada corretamente?**
   Sim. Se surgir um lead de $30 de sua zona, o botão Buy Lead no Lead Market exibirá o texto "Low Balance" de forma persistente, protegido pelo cálculo da função `get_organization_credit_balance()`.
8. **Erro input null foi corrigido?**
   Sim. Nas configurações de Empresa (`CompanySettings.tsx`), valores controlados não causam crash pois utilizam sintaxe `field ?? ""` nativamente.
9. **/success está sem overlay vermelho?**
   Sim. As re-renderizações acionadas indevidamente por `toast` em loop no fluxo do `handleSubmit` foram isoladas. Nenhuma navegação de rota se encavala mais.
10. **Resultado do npm run build**
   Passou com sucesso sem erros de checagem de tipos e montagem limpa dos assets estáticos em desenvolvimento.

“A Fase 5.6.2 corrigiu distribuição automática, destino no Inbox/Leads, filtros do Lead Market e inputs nulos em CompanySettings.”
