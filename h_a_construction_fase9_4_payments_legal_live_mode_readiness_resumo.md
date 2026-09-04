# Resumo da Fase 9.4 — Payments Legal, Refund Policy & Stripe Live Mode Readiness

**Projeto Alvo:** Carpentry (`ozhjvprhhsdglxokfwze` / `https://ozhjvprhhsdglxokfwze.supabase.co`)  
**Data:** 03/09/2026  
**Status:** CONCLUÍDO COM SUCESSO (Base Legal & Operacional Pronta / Modo Live NÃO Ativado / Zero Cobranças Reais)

---

## Executive Summary

A Fase 9.4 preparou a infraestrutura legal e os requisitos comerciais para pagamentos futuros da H&A Construction LLC, sem ativar cobranças reais no Stripe e mantendo a aplicação no Stripe Sandbox Test Mode (`sk_test_...` / `pk_test_...`).

Ações Principais:
1. **Páginas Legais:** Auditoria e confirmação das páginas públicas `/terms`, `/privacy`, `/disclaimer` e `/pricing`.
2. **Refund & Credit Policy (`/refund-policy`):** Criada página pública profissional especificando regras de recarga de créditos para aquisição de leads, exceções por falha técnica/duplicidade e canal oficial de suporte.
3. **Rodapé Público (`Footer.tsx`):** Adicionado link direto para a Refund Policy, completando a navegação legal.
4. **Build & Code Splitting:** Compilado e enviado para produção Vercel com 0 erros de build e typecheck.
5. **Checklist Técnico/Comercial Stripe Live Mode:** Elaborado plano de 15 etapas para transição futura do ambiente de testes para produção oficial.

---

## Checklist de Respostas (26 Pontos)

1. **/terms existe?**  
   **Sim.** Página ativa e estilizada em `/terms`.

2. **/privacy existe?**  
   **Sim.** Página ativa e estilizada em `/privacy`.

3. **/disclaimer existe?**  
   **Sim.** Página ativa e estilizada em `/disclaimer`.

4. **/pricing existe?**  
   **Sim.** Página ativa em `/pricing` exibindo serviços e planos.

5. **/refund-policy foi criada?**  
   **Sim.** Criada em `src/pages-spa/RefundPolicy.tsx` e acessível na rota pública `/refund-policy`.

6. **Footer contém link para Refund Policy?**  
   **Sim.** Atualizado em `src/components/Footer.tsx`.

7. **Pricing foi revisado?**  
   **Sim.** Os pacotes de crédito ($50, $100, $250, $500) em `/admin/billing` foram confirmados, e as assinaturas permanecem como *Coming Soon*.

8. **Billing continua em Test Mode?**  
   **Sim.** Continua operando estritamente em Sandbox Test Mode.

9. **Stripe Live Mode foi ativado? Deve ser não.**  
   **Não.** Chaves live não foram configuradas.

10. **Alguma cobrança real foi feita? Deve ser não.**  
    **Não.** Zero cobranças efetuadas.

11. **Algum SQL foi aplicado? Deve ser não.**  
    **Não.** Nenhum SQL ou migração foi aplicado no Supabase.

12. **Supabase foi alterado? Deve ser não.**  
    **Não.** Nenhuma modificação no schema ou dados do Supabase.

13. **CalhaFlow foi tocado? Deve ser não.**  
    **Não.** O ambiente CalhaFlow (`dembegkbdvlwkyhftwii`) não foi acessado nem tocado.

14. **Refund Policy menciona créditos/leads?**  
    **Sim.** Explica o modelo de compra de créditos para aquisição de solicitações de orçamentos (leads).

15. **Refund Policy evita promessa de garantia de fechamento?**  
    **Sim.** Esclarece explicitamente que a compra de leads não garante o fechamento do serviço ou contrato com o proprietário.

16. **Email info@h-a-construction.com foi usado como suporte?**  
    **Sim.** Endereço oficial indicado na política de reembolso.

17. **Precisa confirmar se info@h-a-construction.com recebe emails?**  
    **Sim.** É recomendado verificar no serviço de email (Resend / Google Workspace) se a caixa de entrada ou o redirecionamento do email `info@h-a-construction.com` está ativo e monitorado.

18. **Live Mode checklist foi criado?**  
    **Sim.** Checklist técnico de 15 passos incorporado nesta documentação.

19. **Secrets continuam protegidas?**  
    **Sim.** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` permanecem isoladas no backend.

20. **Worker continua bloqueado?**  
    **Sim.** Papel `worker` bloqueado de efetuar checkout ou gerenciar billing (HTTP 403).

21. **Amount arbitrário continua rejeitado?**  
    **Sim.** Rejeitado no servidor Express (HTTP 400).

22. **packageId inválido continua rejeitado?**  
    **Sim.** Rejeitado no servidor Express (HTTP 400).

23. **npx tsc passou?**  
    **Sim.** Compilado com sucesso (Exit Code 0).

24. **npm run build passou?**  
    **Sim.** Build compilado com sucesso em 16.2s (Exit Code 0).

25. **Foi feito commit/push/PR/deploy?**  
    **Sim.** Alterações enviadas para `dev-Hugo`, mescladas na `main` e publicadas na Vercel.

26. **Alguma tela branca apareceu?**  
    **Não.** Nenhuma falha de renderização ou tela branca observada.

---

## Live Mode Checklist (15 Etapas para Ativação Futura do Stripe Live)

1. [ ] Confirmar conta Stripe totalmente verificada (ID, documento e endereço legal da empresa).
2. [ ] Confirmar dados fiscais (Tax ID / EIN) e nome legal no Stripe Dashboard.
3. [ ] Confirmar conta bancária e frequência de repasses (payouts) no Stripe.
4. [ ] Configurar Statement Descriptor oficial: `H&A CONSTRUCTION`.
5. [ ] Cadastrar novo endpoint de Webhook Live no Stripe Dashboard (`https://www.h-a-construction.com/api/stripe/webhook`).
6. [ ] Configurar `STRIPE_WEBHOOK_SECRET` live na Vercel.
7. [ ] Obter autorização explícita do proprietário para transição Live.
8. [ ] Substituir `STRIPE_SECRET_KEY` por `sk_live_...` na Vercel (após autorização).
9. [ ] Substituir `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` por `pk_live_...` na Vercel (após autorização).
10. [ ] Fazer redeploy de produção na Vercel.
11. [ ] Executar 1 teste de cobrança real pequena ($50) com cartão real (após autorização).
12. [ ] Validar gravação da transação no ledger Supabase (`external_reference_id`).
13. [ ] Validar emissão e envio de comprovante por email.
14. [ ] Testar fluxo de solicitação de estorno e gestão de disputas no Stripe Dashboard.
15. [ ] Confirmar que todas as chaves de teste foram removidas dos ambientes de produção.
