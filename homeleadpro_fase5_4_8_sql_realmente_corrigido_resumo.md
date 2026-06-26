# Relatório Fase 5.4.8 — SQL Definitivamente Corrigido

Nesta fase garantimos que todas as colunas reais sejam chamadas pelo nome correto e que todos os SELECTs em tabelas potencialmente conflitantes tenham *aliases* explícitos para evitar o erro `column reference is ambiguous`.

## 1. Diagnóstico de Áreas de Atendimento (`008_homeleadpro_diagnostico_fluxo_leads.sql`)
```sql
-- 9. Colunas reais da tabela company_service_areas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'company_service_areas'
ORDER BY ordinal_position;

-- 10. Áreas de atendimento (company_service_areas) - Usando zip e active
SELECT id, organization_id, zip, city, state, active
FROM public.company_service_areas 
LIMIT 20;
```

## 2. Listagem de Leads Disponíveis (`006_homeleadpro_buy_lead_rpc.sql`)
```sql
    -- Usando a tabela real organization_users confirmada
    select ou.organization_id, ou.role into v_org_id, v_role
    from public.organization_users ou
    where ou.user_id = v_user_id and ou.status = 'active'
    limit 1;
```
E na query principal:
```sql
    from public.leads l
    where l.source = 'public' and lower(l.status) = 'new'
      and not exists (select 1 from public.lead_distributions ld where ld.lead_id = l.id and ld.organization_id = v_org_id)
```

## 3. Compra de Lead (`006_homeleadpro_buy_lead_rpc.sql`)
```sql
    -- Usando a tabela real organization_users confirmada
    select ou.organization_id, ou.role into v_organization_id, v_role 
    from public.organization_users ou
    where ou.user_id = v_user_id and ou.status = 'active'
    limit 1;
...
    select l.source, l.service_category_id into v_lead_source, v_service_category_id from public.leads l where l.id = p_lead_id;
    if v_lead_source is null or v_lead_source != 'public' then return jsonb_build_object('success', false, 'message', 'Lead not found or not public.'); end if;

    select exists (select 1 from public.lead_distributions ld where ld.lead_id = p_lead_id and ld.organization_id = v_organization_id) into v_already_bought;
    if v_already_bought then return jsonb_build_object('success', false, 'message', 'Your organization has already purchased this lead.'); end if;

    select pr.base_price into v_base_price from public.lead_pricing_rules pr where pr.service_category_id = v_service_category_id and pr.active = true order by pr.created_at desc limit 1;
```

*(O teste ROLLBACK 008 também foi devidamente sincronizado com estes mesmos aliases `ou.`, impedindo travamento das simulações.)*

---

“A Fase 5.4.8 corrigiu definitivamente zip/active e aliases ambíguos antes do COMMIT.”
