# HomeLeadPro — Preparação para Teste de Login Real no Frontend (Fase 3.5)

Este relatório apresenta o diagnóstico de ambiente do frontend local e instrui a preparação dos testes de login real com as credenciais criadas no Supabase Carpentry (`ozhjvprhhsdglxokfwze`).

---

## 1. Diagnóstico do Ambiente Local

### A. Variáveis de Ambiente Encontradas
As variáveis que configuram o Supabase estão localizadas no arquivo [.env](file:///c:/Desenvolvimento/SiteIhago/Site/.env) do projeto:
*   `NEXT_PUBLIC_SUPABASE_URL`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`
*   `SUPABASE_URL`
*   `NEXT_PUBLIC_DEFAULT_ORG_ID` (Definida como `"45689bbf-193b-4ae8-82f4-e32bbe63b6dd"`)

### B. Confirmação do Projeto Supabase
*   **URL Configuradora:** `https://ozhjvprhhsdglxokfwze.supabase.co`
*   **Ref do Projeto:** `ozhjvprhhsdglxokfwze`
*   **Status:** **Confirmado**. O frontend local está apontando corretamente para o Supabase **Carpentry**.

### C. Comando para Rodar o Frontend Local
De acordo com o `package.json`, o comando principal para iniciar o servidor de desenvolvimento é:
```bash
npm run dev
```
*(Este comando inicia o Next.js na porta 3000)*.

Se preferir rodar em modo SPA puro com o Vite, o comando é:
```bash
npm run dev:vite
```

### D. URL Local para Abrir no Navegador
*   Se iniciado via Next.js: `http://localhost:3000`
*   Se iniciado via Vite: `http://localhost:8080` ou `http://localhost:5173` (conforme exibido no terminal).

### E. Caminho da Tela de Login
*   **Login de Clientes (Reviews & Faturas):** `/login` (arquivo [Login.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/Login.tsx))
*   **Login Administrativo (Dashboard & Settings):** `/admin/login` (arquivo [AdminLogin.tsx](file:///c:/Desenvolvimento/SiteIhago/Site/src/pages-spa/admin/AdminLogin.tsx))

---

## 2. Incompatibilidade Crítica Diagnosticada (O "Pulo do Gato")

> [!WARNING]
> **O Frontend atual NÃO possui campos de E-mail e Senha!**
> As telas `/login` e `/admin/login` estão estruturadas exclusivamente com botões de login social ("Continue com Google" / "Sign In via OAuth"). Não existem inputs na tela e o serviço de autenticação (`admin-auth.ts` e `UserContext.tsx`) não implementa chamadas a `supabase.auth.signInWithPassword(...)`.
> 
> Portanto, **não é possível** digitar diretamente as credenciais `owner-a@homeleadpro.com` / `654321` na interface gráfica atual sem modificar o código.

### Como contornar isso temporariamente para os testes (Planejado para a Fase 4):
1. **Opção Exposição Dev (Fase 4):** No início da Fase 4, incluiremos uma linha no arquivo `src/lib/supabase.ts` para expor o cliente no objeto global da janela:
   ```typescript
   if (typeof window !== 'undefined') { (window as any).supabase = supabase; }
   ```
   Isso permitirá logar rodando a seguinte linha no console (F12) do navegador:
   ```javascript
   await supabase.auth.signInWithPassword({ email: 'owner-a@homeleadpro.com', password: 'password123' })
   ```
2. **Opção Dev Login UI (Fase 4):** Criar um cartão de login alternativo visível apenas em ambiente de desenvolvimento (`process.env.NODE_ENV === 'development'`) com campos de E-mail/Senha para testes rápidos.

---

## 3. Roteiro de Teste Planejado (Pós-Integração)

Uma vez ativado o login por e-mail/senha no início da Fase 4, este será o roteiro de testes para cada usuário:

### A. Usuários a Testar
1.  **`owner-a@homeleadpro.com`** / Senha: `654321` (Proprietário - Empresa A)
2.  **`owner-b@homeleadpro.com`** / Senha: `654321` (Proprietário - Empresa B)
3.  **`admin-a@homeleadpro.com`** / Senha: `654321` (Administrador - Empresa A)
4.  **`worker-a@homeleadpro.com`** / Senha: `654321` (Funcionário - Empresa A)

### B. O que observar em cada login:

| Usuário | Organização Esperada | Dashboard e KPIs | Riscos/Atenção a Observar |
| :--- | :--- | :--- | :--- |
| **`owner-a`** | Empresa A | Deve exibir $70.00 de créditos ($100 inicial - $30 do lead público). Deve exibir 2 leads (1 manual, 1 público) e 1 estimate. | Garantir que ele **não** consiga ver nenhum dado ou orçamento da Empresa B. |
| **`owner-b`** | Empresa B | Deve exibir $5.00 de créditos, 0 leads, 0 estimates. | Testar se ao tentar comprar o lead público do Roofing (custo $30.00), a transação é bloqueada por saldo insuficiente no ledger. |
| **`admin-a`** | Empresa A | Similar ao `owner-a`. Acesso total à Empresa A. | Garantir isolamento contra a Empresa B. |
| **`worker-a`** | Empresa A | **Não** deve ver painéis financeiros (Revenue, Ledger, Sócios). Deve listar apenas 1 job atribuído em sua agenda. | Garantir que o endereço do cliente não seja exibido se a liberação não estiver ativa, e que ele não veja jobs de outros funcionários. |

---

## 4. Riscos Restantes antes da Fase 4

1.  **Casing de Status no Banco vs Frontend:** O banco exige `lowercase` (`'new'`, `'approved'`), mas o frontend envia `'New'`, `'Approved'`. Sem a adaptação da Fase 4, qualquer insert/update falhará por constraints de check.
2.  **Visualização de Leads Públicos:** O frontend atualmente filtra leads por `organization_id`. Leads distribuídos possuem `organization_id = NULL` e estão associados em `lead_distributions`. Sem a correção da Fase 4, a empresa não verá os leads adquiridos.
3.  **Campos de Banco Ausentes:** O frontend tenta ler e salvar `default_footer` em `company_settings`, mas esta coluna física não existe na modelagem do Carpentry.

---

## 5. Próximo Passo Recomendado
*   Autorizar o início da **Fase 4** para realizar as adaptações de código e UI necessárias para suportar a autenticação por e-mail/senha e sanar os desvios de casing e colunas identificados.

---
*Fim do Relatório.*
