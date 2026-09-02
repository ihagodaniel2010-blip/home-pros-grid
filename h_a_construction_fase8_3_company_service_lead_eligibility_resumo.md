# Fase 8.3 — Company Service Setup, Service Areas & Lead Eligibility QA

## 1. Visão Geral
A Fase 8.3 auditou e validou a experiência do usuário empresarial no painel administrativo da H&A Construction, abrangendo a configuração de serviços oferecidos, áreas geográficas de atendimento (ZIP codes), limites de preço por lead, pausa temporária, gestão de saldo e elegibilidade de leads no `LeadMarket`.

---

## 2. Telas Auditadas e Funcionalidades Validadas
- **Serviços & Tarefas (`/admin/services`)**:
  - Listagem dinâmica das categorias `Roofing`, `Painting`, `Remodeling`, `Carpentry`, `Plumbing`, `Drywall/Plaster` e `Flooring/Carpet`.
  - Ativação e desativação granular de tarefas individuais salvas na tabela `company_services`.
- **Áreas de Atendimento (`/admin/locations`)**:
  - Mapeamento e gestão de ZIP codes com suporte a busca e visualização geográfica interativa via Leaflet.
- **Configurações de Recebimento de Leads (`/admin/settings`)**:
  - Toggles para `auto_receive_leads` e status `Active` / `Paused`.
  - Regra de trava da pausa validada para o limite máximo de 20 dias (`maxDateForPause`).
  - Definição de `max_lead_price` e orçamento mensal `monthly_lead_budget`.
- **Lead Market (`/admin/leads`)**:
  - Exibição exclusiva de leads elegíveis com mascaramento de dados sensíveis (nome, telefone, e-mail e endereço exato).
  - Bloqueio de compra manual para saldo insuficiente ou perfil de acesso `worker`.
