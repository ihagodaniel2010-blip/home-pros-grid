-- 002_homeleadpro_functions_triggers_draft_v2.sql
-- Draft Functions and Triggers for HomeLeadPro SaaS Multiempresa (Version 2)
-- Note: Do NOT execute this migration directly without reviews and approval.

--------------------------------------------------------------------------------
-- 🔄 GENERAL TRIGGER HELPER: set_updated_at()
--------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

--------------------------------------------------------------------------------
-- 💳 LEDGER & CREDIT FUNCTIONS
--------------------------------------------------------------------------------

-- 1. Calculate current credit balance of an organization
create or replace function public.get_organization_credit_balance(org_id uuid)
returns numeric
security definer
stable
language plpgsql
as $$
declare
    current_balance numeric;
begin
    select coalesce(sum(amount), 0) into current_balance
    from public.organization_credit_ledger
    where organization_id = org_id;
    
    return current_balance;
end;
$$;

-- 2. Trigger function to prevent negative balances at ledger entry level
create or replace function public.trg_fn_prevent_negative_balance()
returns trigger
security definer
language plpgsql
as $$
declare
    running_balance numeric;
begin
    select public.get_organization_credit_balance(new.organization_id) into running_balance;
    
    running_balance := running_balance + new.amount;
    
    if running_balance < 0 then
        raise exception 'Operação cancelada: Saldo insuficiente. Saldo atual: %, novo saldo solicitado: %', 
            public.get_organization_credit_balance(new.organization_id), running_balance;
    end if;
    
    new.balance_after := running_balance;
    return new;
end;
$$;

drop trigger if exists trg_ledger_prevent_negative_balance on public.organization_credit_ledger;
create trigger trg_ledger_prevent_negative_balance
before insert on public.organization_credit_ledger
for each row
execute function public.trg_fn_prevent_negative_balance();

--------------------------------------------------------------------------------
-- 📊 ESTIMATE & BILLING AUTOMATIONS
--------------------------------------------------------------------------------

-- 1. Automatically calculate total sums for estimate line items
create or replace function public.trg_fn_calculate_item_total()
returns trigger
language plpgsql
as $$
begin
    new.total_price := coalesce(new.quantity, 0) * coalesce(new.unit_price, 0);
    return new;
end;
$$;

drop trigger if exists trg_item_total_price on public.estimate_items;
create trigger trg_item_total_price
before insert or update on public.estimate_items
for each row
execute function public.trg_fn_calculate_item_total();

-- 2. Recalculate estimate header totals (subtotal, tax_amount, total_amount, balance_due)
create or replace function public.recalculate_estimate_totals()
returns trigger
security definer
language plpgsql
as $$
declare
    est_id uuid;
    item_subtotal numeric;
    est_tax_rate numeric;
    est_tax_amount numeric;
    est_discount numeric;
    est_total numeric;
    est_paid numeric;
    est_balance numeric;
    est_pay_status text;
begin
    if (TG_OP = 'DELETE') then
        est_id := old.estimate_id;
    else
        est_id := new.estimate_id;
    end if;

    -- Calculate subtotal from items
    select coalesce(sum(total_price), 0) into item_subtotal
    from public.estimate_items
    where estimate_id = est_id;

    -- Fetch tax_rate, discount_amount, amount_paid from header
    select tax_rate, discount_amount, amount_paid into est_tax_rate, est_discount, est_paid
    from public.estimates
    where id = est_id;

    -- Compute financials
    est_tax_amount := round((item_subtotal * (coalesce(est_tax_rate, 0) / 100.0)), 2);
    est_total := item_subtotal + est_tax_amount - coalesce(est_discount, 0);
    est_balance := est_total - coalesce(est_paid, 0);

    if est_balance <= 0 then
        est_pay_status := 'paid';
    elsif est_paid > 0 then
        est_pay_status := 'partially_paid';
    else
        est_pay_status := 'unpaid';
    end if;

    -- Update estimate header
    update public.estimates
    set subtotal = item_subtotal,
        tax_amount = est_tax_amount,
        total_amount = est_total,
        balance_due = est_balance,
        payment_status = est_pay_status
    where id = est_id;

    return null;
end;
$$;

drop trigger if exists trg_recalculate_totals on public.estimate_items;
create trigger trg_recalculate_totals
after insert or update or delete on public.estimate_items
for each row
execute function public.recalculate_estimate_totals();

--------------------------------------------------------------------------------
-- 🤝 COMPANY PARTNERS percentage validation (soma <= 100% no cadastro, 100% no uso)
--------------------------------------------------------------------------------
create or replace function public.validate_partner_share_percentages()
returns trigger
security definer
language plpgsql
as $$
declare
    total_percentage numeric;
begin
    -- Calculate sum of active partners for this company
    select coalesce(sum(share_percentage), 0) into total_percentage
    from public.company_partners
    where organization_id = new.organization_id 
      and active = true
      and id != new.id; -- Exclude current row to prevent recursion if updating
      
    total_percentage := total_percentage + new.share_percentage;
    
    if new.active = true and total_percentage > 100 then
        raise exception 'Configuração societária inválida: A soma das participações dos sócios ativos não pode exceder 100%%. Total calculado: %%.', total_percentage;
    end if;
    
    return new;
end;
$$;

drop trigger if exists trg_partners_percentage_check on public.company_partners;
create trigger trg_partners_percentage_check
before insert or update on public.company_partners
for each row
execute function public.validate_partner_share_percentages();

-- 2. Function to check if company partners share sum is exactly 100% (Required before executing splits)
create or replace function public.validate_partner_shares_complete(org_id uuid)
returns boolean
security definer
stable
language plpgsql
as $$
declare
    total_percentage numeric;
begin
    select coalesce(sum(share_percentage), 0) into total_percentage
    from public.company_partners
    where organization_id = org_id 
      and active = true;
      
    return (total_percentage = 100.00);
end;
$$;

--------------------------------------------------------------------------------
-- 🔐 SECURE TOKENS GENERATORS
--------------------------------------------------------------------------------
create or replace function public.generate_public_token()
returns text
language sql
as $$
    select encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex');
$$;

-- Automatically assign public tokens on insert for leads, estimates, and extras
create or replace function public.trg_fn_assign_tokens()
returns trigger
language plpgsql
as $$
begin
    if new.public_token is null or new.public_token = '' then
        new.public_token := public.generate_public_token();
    end if;
    return new;
end;
$$;

drop trigger if exists trg_leads_assign_token on public.leads;
create trigger trg_leads_assign_token
before insert on public.leads
for each row
execute function public.trg_fn_assign_tokens();

drop trigger if exists trg_estimates_assign_token on public.estimates;
create trigger trg_estimates_assign_token
before insert on public.estimates
for each row
execute function public.trg_fn_assign_tokens();

drop trigger if exists trg_extras_assign_token on public.service_extras;
create trigger trg_extras_assign_token
before insert on public.service_extras
for each row
execute function public.trg_fn_assign_tokens();

--------------------------------------------------------------------------------
-- 🛡️ SECURE RPCs FOR PUBLIC CLIENT ACCESS (Bypasses RLS but checks token)
--------------------------------------------------------------------------------

-- 1. Fetch estimate details publicly via token (no internal/sensitive fields)
create or replace function public.get_public_estimate(p_token text)
returns json
security definer
stable
language plpgsql
as $$
declare
    result json;
begin
    select json_build_object(
        'id', e.id,
        'client_name', e.client_name,
        'client_email', e.client_email,
        'client_phone', e.client_phone,
        'client_address', e.client_address,
        'client_city', e.client_city,
        'client_state', e.client_state,
        'client_zip', e.client_zip,
        'status', e.status,
        'project_type', e.project_type,
        'subtotal', e.subtotal,
        'tax_rate', e.tax_rate,
        'tax_amount', e.tax_amount,
        'discount_amount', e.discount_amount,
        'total_amount', e.total_amount,
        'payment_status', e.payment_status,
        'notes', e.notes,
        'terms', e.terms,
        'valid_until', e.valid_until,
        'approved_at', e.approved_at,
        'rejected_at', e.rejected_at,
        'company', json_build_object(
            'company_name', cs.company_name,
            'logo_url', cs.logo_url,
            'phone', cs.phone,
            'email', cs.email,
            'website', cs.website
        )
    ) into result
    from public.estimates e
    left join public.company_settings cs on cs.organization_id = e.organization_id
    where e.public_token = p_token;

    if result is null then
        raise exception 'Orçamento não encontrado ou token inválido.';
    end if;

    return result;
end;
$$;

-- 2. Fetch estimate items publicly via token
create or replace function public.get_public_estimate_items(p_token text)
returns table (
    id uuid,
    description text,
    quantity numeric,
    unit_price numeric,
    total_price numeric,
    sort_order integer
)
security definer
stable
language plpgsql
as $$
begin
    -- Ensure token is valid
    if not exists (select 1 from public.estimates where public_token = p_token) then
        raise exception 'Token inválido.';
    end if;

    return query
    select ei.id, ei.description, ei.quantity, ei.unit_price, ei.total_price, ei.sort_order
    from public.estimate_items ei
    join public.estimates e on e.id = ei.estimate_id
    where e.public_token = p_token
    order by ei.sort_order asc;
end;
$$;

-- 3. Fetch client-visible files linked to estimate via token
create or replace function public.get_public_estimate_files(p_token text)
returns table (
    id uuid,
    storage_path text,
    file_url text,
    file_type text,
    mime_type text,
    file_size integer,
    title text,
    description text,
    created_at timestamptz
)
security definer
stable
language plpgsql
as $$
begin
    -- Ensure token is valid
    if not exists (select 1 from public.estimates where public_token = p_token) then
        raise exception 'Token inválido.';
    end if;

    return query
    select sf.id, sf.storage_path, sf.file_url, sf.file_type, sf.mime_type, sf.file_size, sf.title, sf.description, sf.created_at
    from public.service_files sf
    join public.estimates e on e.id = sf.estimate_id
    where e.public_token = p_token
      and sf.visibility = 'client';
end;
$$;

-- 4. Approve estimate via public token (idempotent, logs audit)
create or replace function public.approve_public_estimate(p_token text)
returns boolean
security definer
language plpgsql
as $$
declare
    v_est_record record;
begin
    select id, organization_id, status into v_est_record
    from public.estimates
    where public_token = p_token;

    if v_est_record.id is null then
        raise exception 'Orçamento não encontrado ou token inválido.';
    end if;

    if v_est_record.status not in ('draft', 'sent', 'viewed') then
        raise exception 'Orçamento já foi processado (Status atual: %).', v_est_record.status;
    end if;

    -- Update status
    update public.estimates
    set status = 'approved',
        approved_at = now()
    where id = v_est_record.id;

    -- Log audit
    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (v_est_record.organization_id, 'client_approved', 'estimate', v_est_record.id, jsonb_build_object('token', p_token));

    return true;
end;
$$;

-- 5. Reject estimate via public token (idempotent, logs audit)
create or replace function public.reject_public_estimate(p_token text)
returns boolean
security definer
language plpgsql
as $$
declare
    v_est_record record;
begin
    select id, organization_id, status into v_est_record
    from public.estimates
    where public_token = p_token;

    if v_est_record.id is null then
        raise exception 'Orçamento não encontrado ou token inválido.';
    end if;

    if v_est_record.status not in ('draft', 'sent', 'viewed') then
        raise exception 'Orçamento já foi processado (Status atual: %).', v_est_record.status;
    end if;

    -- Update status
    update public.estimates
    set status = 'rejected',
        rejected_at = now()
    where id = v_est_record.id;

    -- Log audit
    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (v_est_record.organization_id, 'client_rejected', 'estimate', v_est_record.id, jsonb_build_object('token', p_token));

    return true;
end;
$$;

-- 6. Fetch service extra details publicly via token
create or replace function public.get_public_service_extra(p_token text)
returns json
security definer
stable
language plpgsql
as $$
declare
    result json;
begin
    select json_build_object(
        'id', se.id,
        'description', se.description,
        'amount', se.amount,
        'reason', se.reason,
        'status', se.status,
        'approved_at', se.approved_at,
        'rejected_at', se.rejected_at,
        'company', json_build_object(
            'company_name', cs.company_name,
            'phone', cs.phone,
            'email', cs.email
        )
    ) into result
    from public.service_extras se
    left join public.company_settings cs on cs.organization_id = se.organization_id
    where se.public_token = p_token;

    if result is null then
        raise exception 'Custo extra não encontrado ou token inválido.';
    end if;

    return result;
end;
$$;

-- 7. Respond to service extra (approve/reject) via public token
create or replace function public.respond_public_service_extra(p_token text, p_response text)
returns boolean
security definer
language plpgsql
as $$
declare
    v_extra_record record;
    v_new_status text;
begin
    if p_response not in ('approved', 'rejected') then
        raise exception 'Resposta inválida. Deve ser approved ou rejected.';
    end if;

    v_new_status := p_response;

    select id, organization_id, estimate_id, status into v_extra_record
    from public.service_extras
    where public_token = p_token;

    if v_extra_record.id is null then
        raise exception 'Custo extra não encontrado ou token inválido.';
    end if;

    if v_extra_record.status != 'pending' then
        raise exception 'Custo extra já foi respondido (Status atual: %).', v_extra_record.status;
    end if;

    if v_new_status = 'approved' then
        update public.service_extras
        set status = 'approved',
            approved_at = now()
        where id = v_extra_record.id;
        
        -- If associated with an estimate, trigger recalculations if needed
        -- This is handled by recalculation trigger if items changed, or manually done here.
    else
        update public.service_extras
        set status = 'rejected',
            rejected_at = now()
        where id = v_extra_record.id;
    end if;

    -- Log audit
    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (v_extra_record.organization_id, 'client_responded_extra', 'service_extra', v_extra_record.id, jsonb_build_object('response', p_response, 'token', p_token));

    return true;
end;
$$;

-- 8. Fetch public reviews list (only approved and visible)
create or replace function public.get_public_reviews()
returns table (
    id uuid,
    user_name text,
    user_avatar_url text,
    rating integer,
    body text,
    created_at timestamptz
)
security definer
stable
language plpgsql
as $$
begin
    return query
    select r.id, r.user_name, r.user_avatar_url, r.rating, r.body, r.created_at
    from public.reviews r
    where r.is_hidden = false 
      and r.public_approved = true
    order by r.created_at desc;
end;
$$;

-- 9. Submit a review publicly (defaults to public_approved = false)
create or replace function public.submit_public_review(
    p_organization_id uuid,
    p_user_name text,
    p_rating integer,
    p_body text,
    p_lead_id uuid default null
)
returns uuid
security definer
language plpgsql
as $$
declare
    v_new_id uuid;
begin
    if p_rating < 1 or p_rating > 5 then
        raise exception 'Avaliação inválida. Deve ser entre 1 e 5.';
    end if;

    insert into public.reviews (
        organization_id,
        user_name,
        rating,
        body,
        lead_id,
        public_approved,
        is_hidden
    ) values (
        p_organization_id,
        p_user_name,
        p_rating,
        p_body,
        p_lead_id,
        false, -- Needs manual moderation/approval
        false
    )
    returning id into v_new_id;

    return v_new_id;
end;
$$;

--------------------------------------------------------------------------------
-- 🤖 AUTOMATED SYSTEM LEAD ROUTING & IDEMPOTENT CHARGING
--------------------------------------------------------------------------------

-- System-level RPC to distribute a public lead to eligible companies matching ZIP and category.
-- Called by background processor or platform cron under service role.
create or replace function public.distribute_public_lead_to_matching_companies(p_lead_id uuid)
returns integer
security definer
language plpgsql
as $$
declare
    v_lead_record record;
    v_pricing_record record;
    v_price numeric;
    v_max_distributions integer := 3; -- Default limit
    v_distributed_count integer := 0;
    v_matching_org record;
    v_ledger_id uuid;
begin
    -- 1. Retrieve the lead details
    select id, zip, service_category_id, urgency, source, status into v_lead_record
    from public.leads
    where id = p_lead_id;

    if v_lead_record.id is null then
        raise exception 'Lead não encontrado.';
    end if;

    if v_lead_record.source != 'public' then
        raise exception 'Apenas leads públicos podem ser distribuídos pelo sistema.';
    end if;

    -- 2. Fetch platform max distribution settings if exists
    select coalesce((value->>'max_distributions')::integer, 3) into v_max_distributions
    from public.platform_settings
    where key = 'lead_distribution_settings';

    -- 3. Calculate lead cost based on category and platform pricing rules
    select base_price, urgency_multiplier, region_multiplier into v_pricing_record
    from public.lead_pricing_rules
    where service_category_id = v_lead_record.service_category_id
      and active = true
    limit 1;

    if v_pricing_record.base_price is not null then
        v_price := v_pricing_record.base_price * coalesce(v_pricing_record.urgency_multiplier, 1.0) * coalesce(v_pricing_record.region_multiplier, 1.0);
    else
        v_price := 25.00; -- Fallback default price
    end if;

    -- 4. Find all matching companies
    -- Matching criteria:
    --   - Company is active
    --   - Company offers the category of this lead
    --   - Company serves the ZIP code of this lead (via ZIP list list, or radius)
    --   - Company has credit balance >= lead price
    --   - Lead has not been distributed to this company yet
    for v_matching_org in 
        select o.id as org_id, o.name as org_name
        from public.organizations o
        join public.company_services cs on cs.organization_id = o.id
        join public.company_service_areas csa on csa.organization_id = o.id
        where o.status = 'active'
          and cs.service_category_id = v_lead_record.service_category_id
          and cs.active = true
          and csa.active = true
          and (
              -- Match via ZIP code list
              (csa.mode = 'zip_list' and csa.zip = v_lead_record.zip)
              -- OR Match via City (simplified mockup, in prod coordinates/radius calculation is done)
              or (csa.mode = 'city_state' and csa.zip = v_lead_record.zip)
          )
          and public.get_organization_credit_balance(o.id) >= v_price
          and not exists (
              select 1 from public.lead_distributions ld 
              where ld.lead_id = p_lead_id 
                and ld.organization_id = o.id
          )
        order by public.get_organization_credit_balance(o.id) desc -- Prioritize companies with more credit balance
    loop
        -- Stop if we reached the maximum number of distributions for this lead
        select count(*) into v_distributed_count from public.lead_distributions where lead_id = p_lead_id;
        exit when v_distributed_count >= v_max_distributions;

        -- 5. ATOMIC OPERATION: Charge company and register distribution
        -- Unique constraint on (lead_id, organization_id) enforces idempotency at DBMS level
        begin
            insert into public.lead_distributions (
                lead_id,
                organization_id,
                price_charged,
                status
            ) values (
                p_lead_id,
                v_matching_org.org_id,
                v_price,
                'distributed'
            );

            insert into public.organization_credit_ledger (
                organization_id,
                amount,
                transaction_type,
                reference_type,
                reference_id,
                description
            ) values (
                v_matching_org.org_id,
                -v_price,
                'lead_debit',
                'lead_distribution',
                p_lead_id,
                'Débito automático por distribuição de lead público: ' || p_lead_id
            );

            -- Log audit
            insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
            values (v_matching_org.org_id, 'lead_distributed_charge', 'lead', p_lead_id, jsonb_build_object('price', v_price));

            v_distributed_count := v_distributed_count + 1;

        exception when others then
            -- Rollback distribution for this company but continue routing to other companies if it fails
            raise warning 'Falha ao distribuir lead % para a empresa %: %', p_lead_id, v_matching_org.org_name, SQLERRM;
        end;
    end loop;

    -- 6. Update lead status if distributed to at least one company
    if v_distributed_count > 0 then
        update public.leads
        set status = 'distributed'
        where id = p_lead_id;
    end if;

    return v_distributed_count;
end;
$$;

--------------------------------------------------------------------------------
-- ⏳ UPDATED_AT TRIGGERS ATTACHMENT
--------------------------------------------------------------------------------
create trigger trg_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger trg_organization_users_updated_at before update on public.organization_users for each row execute function public.set_updated_at();
create trigger trg_company_settings_updated_at before update on public.company_settings for each row execute function public.set_updated_at();
create trigger trg_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger trg_estimates_updated_at before update on public.estimates for each row execute function public.set_updated_at();
create trigger trg_service_jobs_updated_at before update on public.service_jobs for each row execute function public.set_updated_at();
create trigger trg_extras_updated_at before update on public.service_extras for each row execute function public.set_updated_at();
create trigger trg_receipts_updated_at before update on public.receipts for each row execute function public.set_updated_at();
create trigger trg_partners_updated_at before update on public.company_partners for each row execute function public.set_updated_at();
