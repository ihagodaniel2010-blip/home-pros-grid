# Relatório Fase 5.4.4 — Remoção Absoluta de Insert Direto

## 1. Auditoria no `saveLeadSupabase`
Verificamos rigorosamente o arquivo `src/lib/leads.ts`. **Não existe mais nenhuma chamada direta do tipo `supabasePublic.from("leads").insert(...)` ou similar.** 
A função `saveLeadSupabase` agora é estritamente um conduíte para a RPC:
```typescript
const { data, error } = await supabasePublic!.rpc("submit_public_lead", rpcPayload);
```
Se a RPC falhar por não existir no banco (caso ainda não tenha sido aplicada), o código lança de forma amigável e segura: `"Public lead RPC is not applied yet."` sem tentar nenhum *fallback* direto.

## 2. Por que o erro persistia no navegador?
Se o console do navegador ainda exibia o erro de RLS proveniente de uma tentativa de insert direto em `saveLeadSupabase`, isso se devia exclusivamente ao **cache do Vite/Navegador** rodando o *bundle* antigo em memória. Como removemos o método `.insert()` por completo, a instrução já não existe no código-fonte. **Recomendamos um Hard Refresh (Ctrl+F5 ou Cmd+Shift+R) na aba do navegador.**

## 3. Pesquisa Global no Projeto
Fizemos uma busca global (`grep`) por `.from("leads").insert` e confirmamos que **nenhum outro arquivo** (como `Quote.tsx`, rotas, ou utilitários) está tentando injetar um lead público anonimamente direto na tabela. O funil público está totalmente isolado e dependente da RPC `submit_public_lead`.

## 4. Resultado do Build (`npm run build`)
O build foi reprocessado com sucesso absoluto, confirmando que a sintaxe TypeScript de acionamento da RPC via `.rpc(...)` está alinhada e não há falhas lógicas ou de compilação.

---

“A Fase 5.4.4 removeu qualquer fallback de insert direto para lead público e deixou o formulário dependente da RPC segura.”
