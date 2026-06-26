-- Teste de Validação da RPC buy_public_lead (Fase 5.3.1)

/*
=============================================================================
OPÇÃO A — TESTE VIA FRONTEND (INTERFACE)
=============================================================================
Se você deseja testar o clique no botão "Buy Lead" direto pelo frontend 
(LeadMarket.tsx), rodar este arquivo com `ROLLBACK` NÃO funcionará. 
Por quê? Porque o ROLLBACK desfaz a própria criação da função RPC no banco.

Passo a passo para testar no Front:
1. Certifique-se de que a sintaxe do arquivo `006_homeleadpro_buy_lead_rpc.sql` está correta.
2. Execute o conteúdo de `006_homeleadpro_buy_lead_rpc.sql` e faça o COMMIT no banco.
3. Acesse o frontend com Owner A, e clique em "Buy Lead".

=============================================================================
OPÇÃO B — TESTE VIA SQL EDITOR (SIMULAÇÃO SEGURA)
=============================================================================
Use o bloco abaixo para testar internamente no banco de dados sem alterar 
dados permanentemente (tudo será desfeito pelo ROLLBACK no final).
Ele simula o `auth.uid()` injetando o ID do usuário na sessão da transação.
*/

BEGIN;

-- Instalar a função temporariamente nesta transação para permitir o teste
-- (Você pode colar as funções do 006_homeleadpro_buy_lead_rpc.sql aqui se quiser testar a criação também)

do $$
declare
    v_owner_a uuid;
    v_org_a uuid;
    v_owner_b uuid;
    v_org_b uuid;
    v_worker_a uuid;
    v_public_lead uuid;
    v_result jsonb;
    v_balance_before numeric;
    v_balance_after numeric;
begin
    -- 1. Buscar os IDs reais dos usuários de teste na tabela auth.users
    select id into v_owner_a from auth.users where email = 'owner-a@homeleadpro.com';
    select id into v_owner_b from auth.users where email = 'owner-b@homeleadpro.com';
    select id into v_worker_a from auth.users where email = 'worker-a@homeleadpro.com';

    if v_owner_a is null or v_owner_b is null or v_worker_a is null then
        raise exception 'Usuários de teste não encontrados. O seed foi aplicado?';
    end if;

    -- 2. Buscar as organizações ativas usando a tabela CORRETA (organization_users)
    select organization_id into v_org_a from public.organization_users where user_id = v_owner_a and status = 'active' limit 1;
    select organization_id into v_org_b from public.organization_users where user_id = v_owner_b and status = 'active' limit 1;
    
    if v_org_a is null or v_org_b is null then
        raise exception 'Organizações não encontradas ou usuários não ativos.';
    end if;

    -- 3. Obter um lead público disponível
    select id into v_public_lead from public.leads where source = 'public' and status = 'New' limit 1;
    if v_public_lead is null then
        raise exception 'Nenhum lead público com status New encontrado. Execute o seed ou altere manualmente para testar.';
    end if;

    ---------------------------------------------------------
    -- TESTE 1: Owner-A compra um lead público disponível
    ---------------------------------------------------------
    raise notice '--- TESTE 1: Compra normal (Owner A) ---';
    -- Simular o auth.uid()
    perform set_config('request.jwt.claim.sub', v_owner_a::text, true);
    
    v_balance_before := public.get_organization_credit_balance(v_org_a);
    raise notice 'Saldo antes da compra (A): %', v_balance_before;

    v_result := public.buy_public_lead(v_public_lead);
    raise notice 'Resultado da compra (A): %', v_result;
    
    if not coalesce((v_result->>'success')::boolean, false) then
        raise exception 'Falha ao comprar lead que deveria ter sucesso: %', v_result;
    end if;
    
    v_balance_after := public.get_organization_credit_balance(v_org_a);
    raise notice 'Saldo após a compra (A): %', v_balance_after;
    
    if not exists(select 1 from public.lead_distributions where lead_id = v_public_lead and organization_id = v_org_a) then
        raise exception 'Tabela lead_distributions não foi atualizada!';
    end if;

    ---------------------------------------------------------
    -- TESTE 2: Tentar comprar o mesmo lead de novo (Duplicidade)
    ---------------------------------------------------------
    raise notice '--- TESTE 2: Compra Duplicada (Owner A) ---';
    v_result := public.buy_public_lead(v_public_lead);
    
    if coalesce((v_result->>'success')::boolean, false) then
        raise exception 'Teste 2 Falhou: Compra duplicada foi permitida!';
    else
        raise notice 'Teste 2 OK. Bloqueio duplicata: %', v_result->>'message';
    end if;

    ---------------------------------------------------------
    -- TESTE 3: Owner-B com saldo baixo tenta comprar
    ---------------------------------------------------------
    raise notice '--- TESTE 3: Saldo Insuficiente (Owner B) ---';
    -- Simular o auth.uid() para Owner B
    perform set_config('request.jwt.claim.sub', v_owner_b::text, true);
    
    -- Drenar o saldo de B artificialmente
    insert into public.organization_credit_ledger (
        organization_id, amount, transaction_type, balance_after, description
    ) values (
        v_org_b, 
        -public.get_organization_credit_balance(v_org_b) + 5,
        'adjustment', 
        5,
        'Drenagem de teste'
    );
    
    v_result := public.buy_public_lead(v_public_lead);
    if coalesce((v_result->>'success')::boolean, false) then
        raise exception 'Teste 3 Falhou: Permitida compra com saldo insuficiente!';
    else
        raise notice 'Teste 3 OK. Bloqueio saldo: %', v_result->>'message';
    end if;

    ---------------------------------------------------------
    -- TESTE 4: Worker tenta comprar lead
    ---------------------------------------------------------
    raise notice '--- TESTE 4: Worker Role Restriction (Worker A) ---';
    -- Simular o auth.uid() para Worker A
    perform set_config('request.jwt.claim.sub', v_worker_a::text, true);
    
    v_result := public.buy_public_lead(v_public_lead);
    if coalesce((v_result->>'success')::boolean, false) then
        raise exception 'Teste 4 Falhou: Worker conseguiu executar compra de lead!';
    else
        raise notice 'Teste 4 OK. Bloqueio role worker: %', v_result->>'message';
    end if;
    
    raise notice '---------------------------------------------------';
    raise notice '✅ TODOS OS TESTES PASSARAM COM SUCESSO.';
    raise notice '---------------------------------------------------';

end;
$$;

ROLLBACK;
