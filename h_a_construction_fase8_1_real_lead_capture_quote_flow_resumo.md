# Fase 8.1 — Real Lead Capture, Quote Flow & Admin Intake QA

## 1. Visão Geral
A Fase 8.1 validou e auditou de forma completa o fluxo real de captação de leads públicos, submissão via RPC segura, recepção no painel administrativo, conversão em orçamento e aprovação de jobs.

---

## 2. Auditoria do Fluxo de Captação Públíca
- **Rotas de Orçamento (`/quote/:serviceSlug`)**:
  - Auditadas: `/quote/carpentry`, `/quote/plumbing`, `/quote/drywall-plaster`, `/quote/flooring-carpet`, `/quote/roofing`, `/quote/painting`, `/quote/remodeling`.
  - Tratamento de Slugs: Slugs customizados como `drywall` e `flooring` possuem mapeamento transparente no frontend. Slugs não encontrados exibem fallback seguro com navegação para a listagem geral de serviços sem telas brancas.
- **Segurança da Submissão (RPC)**:
  - O formulário público consome exclusivamente a função RPC segura `submit_public_lead`.
  - **Zero Direct Insert**: Não existe nenhuma chamada de `insert` direto com a role `anon` na tabela `leads`.

---

## 3. Gestão e Distribuição no Admin
- **Recepção em `/admin/leads`**: Leads públicos registrados alimentam a RPC `get_my_organization_leads` e a tabela `lead_distributions`.
- **Proteção de Dados Sensíveis**: No `LeadMarket`, dados pessoais (nome, telefone, e-mail, rua) são mascarados e protegidos por RLS até que a empresa adquira ou receba a distribuição.
- **Restrições de Perfis (Worker)**: Controles de acesso impedem que usuários com perfil `worker` acessem leads indevidos ou visualizem margens financeiras restritas.

---

## 4. Ciclo de Vida: Lead → Estimate → Job
1. **LeadDetail**: Exibe todos os detalhes, fotos enviadas e respostas do questionário.
2. **Create Estimate**: Pré-preenche os dados do cliente no formulário de orçamento.
3. **Public Estimate Link**: Gerado link seguro via token de 64 caracteres `/estimate/:token`.
4. **Approval & Job Conversion**: Aprovação pública pelo cliente altera o status para `approved` e permite gerar o Job de execução.
