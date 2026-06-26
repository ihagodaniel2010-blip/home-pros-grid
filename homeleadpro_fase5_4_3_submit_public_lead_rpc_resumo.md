# Relatório Fase 5.4.3 — Envio Seguro de Lead Público (RPC)

## 1. Por que o RLS bloqueava o insert direto
A política de segurança a nível de linha (RLS) da tabela `public.leads` restringe nativamente a ação `INSERT` apenas a usuários autenticados (Owner, Admin, etc.) e possivelmente com vínculo à organização correspondente. Um usuário não-autenticado (*anon*) oriundo do formulário público `/quote` era bloqueado por não satisfazer os predicados do RLS. Desabilitar essa proteção seria uma quebra severa de segurança.

## 2. Solução Implementada e Arquivo SQL
Foi criada uma proposta SQL (`007_homeleadpro_submit_public_lead_rpc.sql`) contendo uma _Stored Procedure_ (RPC). Esta RPC eleva temporariamente os privilégios da transação usando `SECURITY DEFINER`, executando como o proprietário da função, e assim contorna o RLS *de forma controlada* para permitir a injeção do Lead. 

## 3. Assinatura da RPC `submit_public_lead`
```sql
public.submit_public_lead(
    p_service_slug text, p_selected_service_option text, p_location_type text,
    p_full_name text, p_email text, p_phone text, p_zip text, p_address text,
    p_details text default null, p_subtype text default null,
    p_media_urls jsonb default null, p_selected_pros jsonb default null
) returns jsonb
```

## 4. Campos Permitidos
Somente os campos restritos preenchidos pelo cliente externo no funil da cotação trafegam para a RPC. Nenhum dado administrativo sensível tem via de acesso pelo lado do cliente.

## 5. Campos Bloqueados / Definidos pelo Backend
O interior da função PostgreSQL **trava cirurgicamente** as propriedades de integridade de sistema:
- `source`: Forçado como `'public'`.
- `status`: Forçado como `'New'` (respeitando integralmente a `leads_status_check`).
- `organization_id`: Forçado como `null` (deixando-o orfão e livre para ir para a distribuição/mercado).
- `statusHistory`: O payload local gera o log nativo inicial sem intervenção frontend.

## 6. Alterações no Frontend
No arquivo `src/lib/leads.ts`, a função `saveLeadSupabase` teve sua chamada `supabase.from('leads').insert` destruída. Ela foi reimplementada para orquestrar o JSON rumo ao comando `.rpc("submit_public_lead", rpcPayload)`. Caso a RPC não esteja persistida no banco ainda, ele fará *fallback* devolvendo um erro amigável ao usuário (*"Public lead RPC is not applied yet"*).

## 7. Como Testar no Supabase (ROLLBACK)
Criamos o roteiro `007_test_submit_public_lead_rollback.sql`. Ao aplicá-lo no SQL Editor do Supabase, ele instanciará a função virtualmente em um bloco `BEGIN`, injetará um pacote simulado ("Toilet Repair, 9999999999"), acusará sucesso confirmando a quebra do RLS, e em seguida rodará o `ROLLBACK` para manter a base perfeitamente estéril e limpa.

## 8. Resultado do Build (`npm run build`)
Todos os tipos TypeScript foram respeitados. A refatoração passou com louvor e não restaram códigos órfãos, com os alertas de Render (Toast/Sonner) já pacificados na rodada passada.

## 9. Próximo Passo Recomendado
- Rodar o teste em SQL no editor do Supabase.
- Estando validado com `ROLLBACK`, aplicar (COMMIT) definitivamente o script 007 junto das demais RPCs congeladas no backend real e correr testes "End to End" na UI nativa.

---

“A Fase 5.4.3 preparou o envio seguro de leads públicos via RPC sem desabilitar RLS.”
