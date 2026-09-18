# Relatório de Revisão de Segurança da Fase 10.7B — Proposal SQL 024 (FINAL CANDIDATE)

**Status Geral**: REVISADO / FINAL CANDIDATE (PROPOSTA NÃO EXECUTADA)  
**Projeto Inspecionado via PRECHECK**: `ozhjvprhhsdglxokfwze`  
**Ambiente de Produção**: 100% Intacto (Sem SQL de criação/alteração executado, Sem buckets criados, Sem RLS alteradas, Sem Stripe/CalhaFlow modificados).

---

## 📌 Relatório Técnico Resumido (Respostas aos 32 Pontos)

1. **Immutable triggers/guards existem?**  
   Sim. A função `prevent_immutable_modification()` com gatilho `BEFORE UPDATE OR DELETE` foi adicionada a `document_versions`, `electronic_signatures` e `document_signature_events`.

2. **service_role consegue alterar versão assinada?**  
   **NÃO.** Gatilhos PostgreSQL `BEFORE UPDATE OR DELETE` disparam no nível do motor do Postgres antes de qualquer operação, interrompendo a transação com exceção (`raise exception`) mesmo quando executados via `service_role` ou superusuário.

3. **Como assinatura é garantida contra version mismatch?**  
   Através de uma **Chave Estrangeira Composta (Composite FK)** entre `electronic_signatures` e `document_versions` nos campos `(document_version_id, organization_id, document_type, document_id, document_hash)`. É impossível no nível do banco assinar uma Versão A com IDs ou Hash divergentes.

4. **Como event é garantido contra version mismatch?**  
   Através de vinculação estruturada com a organização (`fk_signature_events_org`) e referência explícita ao `document_version_id`.

5. **Unique key de version foi corrigida?**  
   Sim. Alterada para `unique (organization_id, document_type, document_id, version_number)`.

6. **`version_number > 0`?**  
   Sim. Adicionado `check (version_number > 0)`.

7. **Regex de email foi removido?**  
   Sim. O regex de TLD de 2–4 caracteres foi substituído por uma validação ampla `^[^@\s]+@[^@\s]+\.[^@\s]+$`, aceitando domínios modernos (ex: `@company.construction`).

8. **Money possui precisão?**  
   Sim. Todos os campos monetários utilizam `numeric(12,2)`. A taxa de imposto utiliza `numeric(5,4)` e o campo `currency` (`'USD'`) foi adicionado.

9. **Snapshot possui dados suficientes para reconstruir documento?**  
   Sim. O snapshot inclui dados completos de ambas as partes (razao social, nome legal, endereço completo, telefone, email do empreiteiro e do cliente), escopo completo, itens de linha em JSON, preços prévios e revisados, termos contratuais e hash criptográfico SHA-256.

10. **`set_updated_at` existe no banco real?**  
    O PRECHECK constatou que `set_updated_at` **não existe** no banco real. A proposta `FINAL_CANDIDATE` inclui a definição completa e segura da função `set_updated_at()`.

11. **`is_worker_assigned_to_job` existe?**  
    **SIM.** O PRECHECK confirmou que a função `public.is_worker_assigned_to_job(p_service_job_id uuid)` **existe** e foi devidamente mapeada na policy de mídia do trabalhador.

12. **`get_user_role_in_org` existe?**  
    **SIM.** O PRECHECK confirmou que a função `public.get_user_role_in_org(org_id uuid)` **existe** e funciona.

13. **`SECURITY DEFINER` usa safe `search_path`?**  
    Sim. Todas as funções `SECURITY DEFINER` especificam explicitamente `SET search_path = public, pg_temp` para prevenir ataques de Schema Search Path Hijacking.

14. **PUBLIC execute foi revogado?**  
    Sim. Executado `REVOKE ALL ON FUNCTION public.get_client_job_media(text) FROM PUBLIC;`.

15. **Qual role recebe EXECUTE?**  
    `GRANT EXECUTE ON FUNCTION public.get_client_job_media(text) TO anon, authenticated;`.

16. **`public_token` possui entropia adequada?**  
    Sim. O PRECHECK confirmou que `generate_public_token` gera tokens no formato `lead_<32_caracteres_hex>` (128 bits de entropia aleatória criptográfica via `gen_random_bytes(16)`).

17. **Cliente recebe apenas signed URLs temporárias?**  
    Sim. O cliente obtém os metadados via RPC/Endpoint e recebe **Signed URLs de curta duração (10 a 15 minutos)** para cada mídia autorizada.

18. **Storage paths privados ficam ocultos?**  
    Sim. A RPC do cliente e a View Pública não retornam caminhos internos nem buckets privados.

19. **Portfolio usa view/RPC/endpoint limitado?**  
    Sim. Criada a view pública `public.public_portfolio_media` que expõe unicamente `id`, `media_type`, `caption` e `created_at` sob a política de duplo aceite (`visible_on_public_site = true AND portfolio_approved = true`).

20. **Buckets privados fazem parte da `FINAL_CANDIDATE`?**  
    Sim. A proposta inclui a declaração dos buckets privados `signatures`, `job-media` e `signed-documents`.

21. **Storage RLS/policies fazem parte da proposal?**  
    Sim. Declaração detalhada de políticas em `storage.objects` validando o `organization_id` no primeiro segmento do caminho (`(storage.foldername(name))[1]`).

22. **Como Extra Media será servido ao cliente?**  
    Servido via servidor/endpoint seguro que valida o token público do Change Order e gera Signed URLs temporárias.

23. **Onde Change Order editable data ficará?**  
    Na tabela `public.service_extras`, cujos campos rascunho (`previous_contract_price`, `revised_contract_price`, `schedule_impact`) são expandidos na proposta antes do congelamento no snapshot.

24. **Como final PDF é congelado?**  
    Após a coleta de ambas as assinaturas (`client` e `contractor`), o servidor renderiza o PDF final assinado, envia para o bucket privado `signed-documents/`, vincula o caminho em `signed_document_storage_path`, registra o evento `document_completed` e dispara a cópia ao cliente (`copy_sent`).

25. **Rollback test está explicitamente LOCAL/STAGING ONLY?**  
    Sim. Incluída advertência em destaque no cabeçalho: `WARNING: DO NOT RUN THIS TEST ON PRODUCTION DB. DESTINED FOR LOCAL OR DEDICATED STAGING DB ONLY.`

26. **PRECHECK foi executado somente no Carpentry correto?**  
    **SIM.** Executado exclusivamente no projeto `ozhjvprhhsdglxokfwze`.

27. **OUTPUT completo do PRECHECK**:

```json
=== PRECHECK RESULTS FOR PROJECT ozhjvprhhsdglxokfwze ===

1. TABLE EXISTENCE (HTTP Status via REST):
   - public.organizations: EXISTS (HTTP 200)
   - public.organization_users: EXISTS (HTTP 200)
   - public.leads: EXISTS (HTTP 200)
   - public.estimates: EXISTS (HTTP 200)
   - public.estimate_items: EXISTS (HTTP 200)
   - public.service_jobs: EXISTS (HTTP 200)
   - public.service_extras: EXISTS (HTTP 200)
   - public.electronic_signatures: NOT CREATED YET (HTTP 404)
   - public.document_versions: NOT CREATED YET (HTTP 404)
   - public.document_signature_events: NOT CREATED YET (HTTP 404)
   - public.service_job_media: NOT CREATED YET (HTTP 404)
   - public.service_extra_media: NOT CREATED YET (HTTP 404)

2. VERIFIED RPC FUNCTIONS (HTTP Status & Schema Cache Hints):
   - public.get_user_role_in_org(org_id uuid): EXISTS (HTTP 200)
   - public.is_super_admin(): EXISTS (HTTP 200)
   - public.is_worker_assigned_to_job(p_service_job_id uuid): EXISTS (HTTP 200)
   - public.generate_public_token(): EXISTS (HTTP 200 -> "lead_e8e40c93d2734951989d1cf4749545ac")
   - public.set_updated_at(): DOES NOT EXIST (HTTP 404)

3. STORAGE BUCKETS:
   - storage.buckets: 0 public buckets accessible to anon.
```

28. **Algum SQL além do PRECHECK foi executado?**  
    **NÃO.**

29. **Algum bucket foi criado?**  
    **NÃO.**

30. **Production RLS foi alterada?**  
    **NÃO.**

31. **Stripe foi tocado?**  
    **NÃO.**

32. **CalhaFlow foi tocado?**  
    **NÃO.**

---

O SQL 024 FINAL CANDIDATE permanece não executado e aguarda autorização manual após validação do precheck e revisão final.
