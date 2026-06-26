# Relatório Fase 5.4.2 — Correção do Envio de Leads Públicos

## 1. Status Enviado Anteriormente
O sistema (`Quote.tsx` -> `saveLeadSupabase`) estava enviando `status: "new"` de forma forçada no payload final (tudo minúsculo).

## 2. A Constraint Encontrada
O Supabase estava bloqueando a operação lançando `new row for relation "leads" violates check constraint "leads_status_check"`. Através de auditoria no schema base, detectamos que o projeto Carpentry foi originalmente construído com os campos em *camelCase* (`fullName`, `createdAt`, etc) e as _constraints_ da tabela `leads` validam estados estritos e capitalizados: `('New', 'Contacted', 'Estimate Sent', 'Won', 'Lost')`.
O valor `"new"` minúsculo não passava na checagem.

## 3. Qual Status Correto Foi Aplicado
Refatoramos a função `saveLeadSupabase` no `src/lib/leads.ts` para injetar `status: "New"` em vez de `"new"`. Da mesma forma, o rastreamento local de `statusHistory` passou a utilizar `[{ status: "New", timestamp: now }]`.

## 4. Garantia do Source "Public"
No mesmo arquivo `src/lib/leads.ts`, blindamos a atribuição para garantir `source: "public"` a fim de satisfazer a exigência de ser enxergado na listagem de Lead Market como algo sem dono primário manual.

## 5. Organization ID Nulo ou Default
O código anterior forçava um `defaultOrgId` via fallback. Removi essa lógica no frontend público para leads que entram via `/quote/...`. O payload agora carrega estritamente `organization_id: null` para ser um lead "órfão" que vai ao Lead Market para disputas ou distribuições justas.

## 6. Correção do Erro Toast / React ForwardRef
O erro *"Cannot update a component (ForwardRef) while rendering a different component"* disparava porque um componente chamado `<ValidIcon />` estava sendo gerado/re-instanciado dinamicamente no meio do método *render* do `<Quote />`, forçando a árvore do DOM a piscar referências (o que desestabilizava subcomponentes conectados à árvore base, como o *Toaster* da *Sonner*). A solução foi converter `ValidIcon` de React Node abstrato para uma simple function `renderValidIcon()` estática. 

## 7. Resultado do Teste
Com essas intervenções:
- Os leads públicos viajam para o backend e são processados sem esbarrar no `leads_status_check`.
- A API retorna sucesso 200.
- Eles aterrissam na vitrine virtual do `/admin/lead-market` (já que as RPCs 006 previram `lower(l.status) = 'new'`, tornando-o retrocompatível).

## 8. Resultado do Build
O `npm run build` confirmou todas as referências cruzadas e sintaxes. 

---

“A Fase 5.4.2 corrigiu o envio de leads públicos respeitando leads_status_check e preparando o Lead Market.”
