# Fase 5.2 — Lead Market / Distribuição e Compra de Leads

> **Status:** Fluxo de mercado de leads implementado no frontend MVP e RPCs propostas. Build bem sucedido.

---

## 1. Arquivos Alterados
- `src/pages-spa/admin/LeadMarket.tsx` (Novo componente da loja)
- `src/lib/lead-market.ts` (Novo helper de funções do Lead Market)
- `src/components/admin/AdminLayout.tsx` (Menu lateral de navegação atualizado)
- `src/App.tsx` (Rota `/admin/lead-market` adicionada)
- `supabase/migrations/006_homeleadpro_buy_lead_rpc.sql` (Arquivo de proposta SQL com a RPC)

---

## 2. Decisão da RPC (SQL 006 Proposto)
Após auditar o banco e as *migrations* atuais (v7 aplicadas), constatamos que existia a RPC `distribute_public_lead_to_matching_companies` (focada em automatizar distribuições ativas), mas não existia uma RPC dedicada à ação de **comprar um lead** pelo frontend (`buy_lead`).
- Sendo assim, o arquivo **`006_homeleadpro_buy_lead_rpc.sql`** foi elaborado como **proposta** (não aplicado automaticamente).
- Ele contém:
  - `get_public_available_leads(org_id)`: Lista leads que são públicos e que a empresa ainda não comprou.
  - `buy_public_lead(lead_id)`: Deduz os créditos, valida se a empresa possui saldo (`get_organization_credit_balance`) e insere o registro em `lead_distributions`.

---

## 3. Tela Lead Market
Criada a interface `LeadMarket.tsx`. Nela:
- Owner/Admin visualiza uma loja ("Store") contendo os leads públicos passíveis de compra.
- Estão ocultos leads que a empresa já tenha comprado.
- A tela exibe as informações mascaradas/básicas do lead (Serviço, Urgência, Data, ZIP Code e Cidade).
- Há um botão **Buy Lead** que chama a função do Supabase. Como a RPC está pendente de aprovação, um alerta (*Note*) avisa que a operação pode falhar por falta da função no banco de dados, em aderência às regras do MVP de não debitar manualmente do front-end.

---

## 4. Saldo / Créditos
Para exibir o saldo de créditos disponíveis:
- A função `getOrganizationBalance` no TypeScript tenta primeiro usar a RPC nativa `get_organization_credit_balance`.
- Caso ela não exista ou falhe localmente (por divergências de cache ou ambiente não propagado), ocorre um *fallback* que soma com RLS os valores da tabela `organization_credit_ledger` garantindo exibição de saldo independentemente da aplicação total de scripts.

---

## 5. Compra / Distribuição
Ao clicar em "Buy Lead":
- A função chama a RPC proposta.
- Se aprovado, a RPC debitaria do ledger e inseriria em `lead_distributions`.
- Em sucesso simulado, o lead é imediatamente removido da lista do Market na interface (adicionado a um Set de "comprados").
- O saldo do cabeçalho é dinamicamente atualizado sem precisar de recarregamento.

---

## 6. Inbox (A Caixa de Entrada)
- O Inbox (listagem no `/admin/inbox`) já possui as integrações RLS nativas provenientes das fases anteriores. 
- Assim, o `getLeads()` padrão e a Policy de segurança garantem que: 
  - Leads manuais criados pela empresa apareçam.
  - Leads que o Supabase entende que a empresa "comprou" (que estão na `lead_distributions` com a Role de Owner/Admin ativa na org) aparecem de forma transparente.
  - Leads públicos ainda não comprados não são enviados para a interface pelas camadas de segurança do backend.

---

## 7. Bloqueio de Worker
- A proteção já iniciada nas fases anteriores foi fortalecida:
  - Em `AdminLayout.tsx`, o menu lateral filtra a exibição de "Lead Market" se a `role` for "worker".
  - Há uma restrição em `useEffect` de roteamento: se um `worker` tentar forçar a URL `/admin/lead-market`, ele será capturado pelo hook e forçado de volta para a rota base `/admin`.

---

## 8. Testes Manuais
- O Owner entra em `/admin/lead-market` e percebe a loja, seu saldo via ledger, e os cards formatados.
- Ao clicar no botão `Buy Lead` e simular saldo baixo, ele é bloqueado. Com saldo, ele aciona a API e pode ver a mensagem de restrição de RPC ou concluir caso o backend receba a aplicação posterior.
- O Worker ao logar na sua conta não vê o ícone "Lead Market" e não possui acesso roteado a nenhuma outra listagem global.

---

## 9. Resultado do Build
O teste `npm run build` confirmou todas as importações cruzadas, *hooks* do React Router e aderências de tipagem TypeScript em relação ao `Lead` com sucesso absoluto. Sem quebras de compilação.

---

## 10. Pendências Restantes
- O banco local deve ser atualizado para acolher os scripts (`005`, `005b`, e agora o `006_homeleadpro_buy_lead_rpc.sql`) para as interações saírem do "stub" ou de falha de segurança de RLS no backend e passarem a executar fisicamente as deduções da base de dados e filtragens finas do Worker.

---

## 11. Próximo Passo
Submeter as propostas SQL (`005`, `005b`, `006`) a uma aprovação e aplicação, confirmando se o *schema* comportará de ponta a ponta o MVP na cloud. Após isso, pode-se iterar a **Fase 6** focando em relatórios (*Analytics Dashboard*) ou fluxo de SMS bidirecional, caso seja do escopo da etapa inicial.

A Fase 5.2 implementou o Lead Market/compra de leads sem reaplicar migration ou seed automaticamente.
