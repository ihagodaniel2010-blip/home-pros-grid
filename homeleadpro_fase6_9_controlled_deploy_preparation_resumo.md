# Resumo - Fase 6.9 (Controlled Deploy Preparation)

A auditoria de ambiente foi conduzida com sucesso. Nenhuma ação direta em servidores de produção foi executada. Este documento formaliza que o projeto local está alinhado e preparado para transição ao ambiente web.

## Verificação de Projeto e Ambiente

1. **Projeto correto confirmado?**
   Sim. O projeto ativo é o `HomeLeadPro/Barrigudo`.
2. **Supabase Carpentry confirmado?**
   Sim. As variáveis em `.env` apontam exatamente para a Ref ID: `ozhjvprhhsdglxokfwze` (URL: `https://ozhjvprhhsdglxokfwze.supabase.co`).
3. **Alguma referência indevida a CalhaFlow encontrada?**
   Não. Verifiquei as chaves de ambiente e os arquivos críticos; não há *tokens* apontando para projetos obsoletos ou vazamento de *secrets* de outras aplicações.
4. **Variáveis de ambiente necessárias foram listadas?**
   Sim. Ambas as versões (*Vite* e *Next*) possuem representação:
   - `NEXT_PUBLIC_SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
5. **Algum secret foi exposto? Deve ser não.**
   Não. O `.env.example` mascara perfeitamente as chaves sensíveis com `YOUR_SUPABASE_ANON_KEY` e a Service Role Key está em branco no ambiente inspecionado.
6. **SQL 016 continua não aplicado?**
   Sim. O esquema final validado foi o das _migrations_ `012`, `013`, `014` e `015`. A migração `016` segue proposta em arquivo, sem integração ao DB.
7. **Buckets foram confirmados?**
   Sim. A dependência `013_storage_receipts_bucket_policies.sql` configurou adequadamente o _bucket_ `receipts` para acesso privado e dependente de *Signed URLs*.
8. **Rotas críticas foram listadas?**
   As rotas vitais para a avaliação pós-deploy compõem:
   - `/admin/login` e `/admin/dashboard`
   - `/admin/leads`, `/admin/expenses`, `/admin/reimbursements`
   - `/admin/client-receipts` e `/public/receipt/`
   - `/admin/estimate-assistant`, `/admin/tax-center`, `/admin/notifications`, `/admin/reports`
9. **Checklist pós-deploy foi criado?**
   Sim, o checklist formal foi incorporado à documentação (*detalhes abaixo*).
10. **Existe algum bloqueio antes do deploy?**
    Nenhum impeditivo arquitetural ou instabilidade de código (*Build Verde*). O único pré-requisito é o mapeamento cauteloso das envs na plataforma de _hosting_ (Vercel).
11. **npm run build continua passando?**
    Sim. Total compatibilidade validada na Fase 6.8 com *exit code 0*.
12. **O sistema está pronto para deploy manual/autorizado?**
    Integralmente pronto para deploy controlado na Vercel.

---

## Vercel / Diretrizes de Deploy

- **Comando de Build:** `npm run build`
- **Output Esperado:** Diretório estático compilado sob o padrão Next.js App Router (ou dist/out se estritamente SPA).
- **Variáveis Vercel Obrigatórias:** Injetar as envs `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (além das variantes VITE, a depender do _build config_ final do _framework_).
- **Rotas e Rewrites:** O projeto opera primordialmente via *SPA Catch-All Route* (`[[...slug]]`). Certifique-se de que o provedor não corrompa roteamentos da History API do React Router (`/admin/*`).

---

## Checklist de Testes Pós-Deploy

Para ser executado manualmente assim que a versão *Live* estiver provisionada:

- [ ] Realizar login com usuário **Owner/Admin**.
- [ ] Realizar login com usuário **Worker**.
- [ ] Verificar se Worker sofre bloqueio sumário e expulsão visual nas páginas: *Financeiras, Reports e Tax*.
- [ ] Criar ou modificar um *Lead* teste na base de produção.
- [ ] Criar um *Estimate*.
- [ ] Gerar e abrir o link de acesso externo de um *Public Receipt* (`/public/receipt/:token`).
- [ ] Realizar _upload_ de foto simulando uma *Expense* (*Receipt File*).
- [ ] Baixar o arquivo anexado certificando-se de que a *Signed URL* privada opera bem na nuvem.
- [ ] Simular um lançamento e aprovação em *Reimbursements*.
- [ ] Averiguar se o *Tax Center* detecta as operações do dia.
- [ ] Certificar que as *Notifications* estouram no *badge* flutuante.
- [ ] Confirmar que o *Reports/Dashboard* renderiza sem travar (sem erros 500 no Vercel Logs).
