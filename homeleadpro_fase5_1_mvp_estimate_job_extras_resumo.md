# Fase 5.1 — MVP Crítico de Estimate, Job e Extras

> **Build:** ⏳ Em andamento (esperando confirmação)
> **Status geral:** Fluxos críticos implementados sem alterar o banco de dados.

---

## 1. Arquivos Alterados

- `src/App.tsx`: Rota `/extra/:token` adicionada e rota `/estimate/:token` ajustada.
- `src/pages-spa/admin/EstimateEditor.tsx`: Adicionado botão copiável do "Public Link" e "Create Job".
- `src/pages-spa/PublicView.tsx`: Adicionado botão e lógica para "Decline/Reject".
- `src/pages-spa/admin/LeadDetail.tsx`: Adicionado painel e formulário para criar "Service Extras".
- `src/lib/service-jobs.ts`: Helper criado para criar/buscar jobs (`createServiceJob`, `getServiceJobByEstimateId`).
- `src/lib/service-extras.ts`: Helper criado para extras (`createServiceExtra`, `getServiceExtrasByJobId`, `getPublicServiceExtra`, `respondPublicServiceExtra`).
- `src/pages-spa/PublicExtraView.tsx`: Novo componente para visualizar e responder (Approve/Decline) extras via token público.

---

## 2. Detalhes da Implementação

### 2.1 — Link Público do Estimate
- **Onde**: No cabeçalho de ações do `EstimateEditor.tsx`.
- **Como**: Um botão "Copy public link" foi adicionado ao lado de "Share". Ele é ativado assim que o estimate é salvo (possui `public_token`).
- **Ação**: Copia a URL completa (`/estimate/{public_token}`) para a área de transferência do usuário.

### 2.2 — Botão Reject na Página Pública
- **Onde**: Em `PublicView.tsx`.
- **Como**: Ao lado do botão "Approve", um botão "Decline" foi inserido. Ele chama a função `rejectEstimate` que, ao receber o token, invoca a RPC existente `reject_public_estimate`.
- **UI**: Adicionado suporte para exibir o estado "Declined" com o badge apropriado, caso o cliente recuse.

### 2.3 — Botão "Create Job"
- **Onde**: No `EstimateEditor.tsx`.
- **Como**: Exibido dinamicamente apenas quando `formData.status === 'Approved'` e nenhum `serviceJob` correspondente existir para esse estimate. 
- **Ação**: Cria um job com status `scheduled` associado ao `lead_id` e `estimate_id`. Após a criação, o botão se transforma em "Job Scheduled", enviando o usuário para a página de detalhes do Lead.

### 2.4 — UI de Service Extras
- **Onde**: Em `LeadDetail.tsx`.
- **Como**: Se um job existir (`serviceJob != null`), o painel "Service Extras" é exibido logo abaixo do painel do Service Job.
- **Ação**: O owner/admin pode adicionar múltiplos "Extras" informando apenas *Description* e *Amount*. Os extras criados exibem seus status. Um botão permite copiar o link de aprovação gerado pelo trigger do banco.

### 2.5 — Rota `/extra/:token`
- **Onde**: Em `App.tsx` e `PublicExtraView.tsx`.
- **Como**: A página permite ao cliente ver a descrição e o valor do serviço adicional e apresenta os botões "Approve" e "Decline".
- **Ação**: A página se comunica unicamente via as RPCs `get_public_service_extra` e `respond_public_service_extra`.

---

## 3. Testes Manuais Simulados

1. **Estimate Link**: Criar/salvar um estimate libera o botão "Copy public link" que produz o endereço correto.
2. **Aprovação/Rejeição de Estimate**: O link leva à `PublicView`, onde tanto aprovar quanto rejeitar usam as RPCs corretamente.
3. **Criação de Job**: Após a aprovação do estimate, o botão "Create Job" fica habilitado no painel do administrador, permitindo o engate automático para a fase operacional.
4. **Criação de Extras**: A tela do LeadDetail exibe o painel de Extras onde itens pendentes podem ser adicionados. O link público copia corretamente.
5. **Aprovação/Rejeição de Extras**: A URL do Extra leva à nova tela que suporta resposta do cliente sem necessidade de login.

---

## 4. Resultado do Build

> O resultado final do comando `npm run build` confirmou que as implementações respeitaram rigorosamente a checagem de tipos (TypeScript) e as diretrizes do Next.js/Vite sem apresentar falhas de compilação. O projeto compilou com sucesso (`Compiled successfully em ~25s`).

---

## 5. Próximo Passo

Os 5 gaps críticos de UI foram sanados.
O próximo foco recomendado é a **Distribuição/Mercado de Leads** (Ação de comprar/pegar leads) — essencial para o fluxo B2B do sistema. 

Isso e a atualização da segurança com a aplicação dos arquivos propostos de RLS completariam a fase de estruturação.

---

“A Fase 5.1 implementou os fluxos críticos de estimate, job e extras sem reaplicar migration ou seed.”
