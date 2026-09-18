# Relatório de Revisão de Segurança da Fase 10.7B — Proposal SQL 024 (FINAL REVIEW)

**Status Geral**: REVISADO / NÃO EXECUTADO (FINAL REVIEW ONLY)  
**Data**: 17/09/2026  
**Ambiente de Produção**: 100% Intacto (Sem SQL aplicado, Sem buckets criados, Sem RLS alteradas, Sem Stripe/CalhaFlow modificados).

---

## 1. Resumo Executivo das Respostas Técnicas

1. **Por que `visible_to_client = true` sozinho era inseguro?**  
   Porque uma policy RLS simples baseada apenas em `using (visible_to_client = true)` sem validar a relação de propriedade (Job X Cliente) permitiria que qualquer usuário anônimo ou cliente autenticado efetuasse `SELECT` em todas as mídias marcadas como visíveis para qualquer cliente no sistema inteiro, violando o isolamento entre organizações e clientes.

2. **Qual será o modelo seguro de acesso do cliente?**  
   Acesso estritamente mediado por função `SECURITY DEFINER` (RPC) denominada `get_client_job_media(p_job_token)` ou endpoint server-side validado por token público individual do Job/Estimate. Não haverá `SELECT` direto do cliente na tabela `service_job_media`.

3. **Media default agora é private?**  
   Sim. Na proposta 024 FINAL REVIEW:
   - `visible_to_client boolean not null default false`
   - `visible_on_public_site boolean not null default false`
   - `portfolio_approved boolean not null default false`  
   Toda mídia nasce estritamente Admin Only.

4. **Existe `document_versions`/`snapshots`?**  
   Sim. Criada a tabela `document_versions` contendo todos os dados imutáveis do contrato/estimate/change order (escopo, line items, subtotal, impostos, total, endereço, partes e `document_hash`).

5. **Existe `document_signature_events`?**  
   Sim. Criada a tabela `document_signature_events` para auditar a cronologia completa do documento (`document_created`, `document_sent`, `document_viewed`, `electronic_consent_accepted`, `signature_started`, `client_signed`, `contractor_signed`, `document_completed`, `copy_sent`).

6. **`document_hash` é obrigatório?**  
   Sim. Campo `document_hash text not null check (length(document_hash) = 64)` em ambas as tabelas (`document_versions` e `electronic_signatures`).

7. **Qual algoritmo de hash?**  
   Canonicalização JSON dos dados contratuais + **SHA-256** (representado como string hexadecimal de 64 caracteres).

8. **Existe `signer_role`?**  
   Sim. Enum/Check constraint: `signer_role check (signer_role in ('client', 'contractor'))`.

9. **Cliente/H&A podem assinar separadamente?**  
   Sim. Cada assinatura grava um registro independente apontando para a mesma versão do documento (`document_version_id`).

10. **Como evita edição silenciosa depois da assinatura?**  
    O contrato assinado referencia uma versão imutável (`document_versions`). Caso ocorra alteração material no escopo ou valor, o sistema cria uma **nova versão** (`version_number + 1`) com um novo `document_hash`, exigindo uma nova rodada de assinaturas e preservando a versão antiga intacta.

11. **Como IP será capturado server-side?**  
    Através do Server Action / Endpoint Next.js/API (utilizando `headers().get('x-forwarded-for')` ou `request.ip`), injetado via RPC/Server Client. Nunca confiando em IP enviado pelo payload do browser.

12. **Como user-agent será capturado?**  
    Extraído diretamente pelo servidor a partir do header HTTP `User-Agent` da requisição de assinatura.

13. **Como consent text/version será preservado?**  
    Através dos campos `consent_version` (ex: `v1.0_UETA_ESIGN`) e `consent_text` gravados de forma imutável em cada linha de `electronic_signatures`.

14. **Onde signature image será armazenada?**  
    No bucket privado `signatures/`, sob o path `organization_id/documents/document_type/document_id/version_id/signatures/{signer_role}.png`.

15. **Onde signed PDF será armazenado?**  
    No bucket privado `signed-documents/`, sob o path `organization_id/signed-documents/document_type/document_id/{version_id}_signed.pdf`.

16. **Buckets são privados?**  
    Sim, 100% PRIVATE. Nenhuma imagem de assinatura, documento assinado ou foto de cliente possui URL pública permanente.

17. **Como cliente recebe acesso?**  
    Via **Signed URLs de curta duração** (ex: expiração de 15 minutos) geradas dinamicamente pelo servidor após validação de autorização.

18. **Como portfolio público recebe acesso?**  
    Duplo bloqueio obrigatório: a mídia só fica legível para o portfolio público se `visible_on_public_site = true AND portfolio_approved = true`.

19. **`service_extra_media` possui RLS completa?**  
    Sim. Habilitado RLS com policy restrita para Owners/Admins da organização.

20. **`service_job_media` possui RLS segura?**  
    Sim. Isolamento total por organização (`get_user_role_in_org(organization_id) in ('owner', 'admin')`), acesso por RPC para cliente e política de duplo aceite para site público.

21. **Worker access está limitado?**  
    Sim. O acesso do worker é estritamente limitado por `is_worker_assigned_to_job(service_job_id)`. Se não houver atribuição ao Job, o acesso é negado. Workers não têm acesso a relatórios financeiros, relatórios de impostos ou assinaturas de outros Jobs.

22. **Quais indexes foram adicionados?**  
    - `idx_document_versions_lookup` em `(organization_id, document_type, document_id)`
    - `idx_electronic_signatures_doc` em `(organization_id, document_id)`
    - `idx_electronic_signatures_ver` em `(document_version_id)`
    - `idx_signature_events_lookup` em `(document_id, document_version_id)`
    - `idx_service_job_media_job` em `(organization_id, service_job_id)`
    - `idx_service_job_media_public` em `(visible_on_public_site, portfolio_approved)`
    - `idx_service_extra_media_extra` em `(organization_id, service_extra_id)`

23. **Quais constraints foram adicionadas?**  
    - `signer_role in ('client', 'contractor')`
    - `document_type in ('estimate', 'change_order', 'contract')`
    - `media_type in ('image', 'video')`
    - `file_size_bytes > 0`
    - `length(document_hash) = 64`
    - `ON DELETE RESTRICT` em tabelas jurídicas/audit trail para impedir cascata acidental.

24. **Precheck foi criado?**  
    Sim: `024_precheck_job_project_media_and_esignatures.sql` (Contém APENAS comandos `SELECT`).

25. **Rollback TEST agora usa `BEGIN/ROLLBACK`?**  
    Sim: `024_test_job_project_media_and_esignatures_ROLLBACK.sql` executa toda a proposta dentro de uma transação isolada e chama `ROLLBACK` ao final.

26. **Ele deixa zero mudanças?**  
    Sim, **exatamente zero** alterações no banco de dados.

27. **Existe algum `CASCADE` no rollback test?**  
    **NÃO.**

28. **FINAL_REVIEW foi criado?**  
    Sim: `024_job_project_media_and_esignatures_FINAL_REVIEW.sql` com o cabeçalho `PROPOSAL FOR MANUAL REVIEW ONLY — DO NOT EXECUTE`.

29. **Algum SQL foi executado?**  
    **NÃO.**

30. **Algum bucket foi criado?**  
    **NÃO.**

31. **RLS de produção foi alterada?**  
    **NÃO.**

32. **CalhaFlow foi tocado?**  
    **NÃO.**

33. **Stripe foi alterado?**  
    **NÃO.**

---

O SQL 024 foi redesenhado para uma arquitetura segura de assinaturas eletrônicas, versionamento imutável, audit trail e mídia privada com controle de acesso, permanecendo somente como FINAL REVIEW e sem qualquer alteração no banco de produção.
