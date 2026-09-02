# Fase 8.6 — Email, Notification Templates & Communication Readiness

## 1. Visão Geral
A Fase 8.6 mapeou, padronizou e criou os templates de comunicação interna e externa para a H&A Construction, além de disponibilizar a nova central administrativa em `/admin/communications` ([Communications.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/Communications.tsx)).

---

## 2. Estrutura de Comunicação e Templates (`src/lib/communicationTemplates.ts`)
- **14 Fluxos Estruturados**:
  - `quote_request_received_customer`
  - `new_lead_available_company`
  - `lead_purchased_company`
  - `estimate_sent_customer`
  - `estimate_approved_company`
  - `estimate_rejected_company`
  - `service_extra_sent_customer`
  - `service_extra_approved_company`
  - `payment_received_customer_receipt`
  - `client_receipt_viewed_company`
  - `expense_missing_receipt_company`
  - `reimbursement_pending_company`
  - `low_credit_balance_company`
  - `job_status_update_customer`
- **Atributos de Cada Template**:
  - `subject`, `preview`, `bodyText`, `bodyHtml` e array de variáveis dinâmicas (`variables`).
- **Marca & Identidade**:
  - Exclusivamente **H&A Construction** e **https://h-a-construction.com**.
  - Zero referências a marcas antigas ou descontinuadas.
- **Visualização Administrativa (`/admin/communications`)**:
  - Filtro de templates por público (`Customer`, `Company`, `Internal`).
  - Inspeção visual de assunto, versão em texto simples, layout HTML renderizado e placeholders.
  - Funcionalidade de cópia rápida para a área de transferência.
  - Indicador claro de prontidão ("Email & SMS dispatch disabled / Coming Soon").
