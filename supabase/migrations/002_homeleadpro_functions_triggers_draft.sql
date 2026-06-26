-- 002_homeleadpro_functions_triggers_draft.sql
-- Draft Functions and Triggers for HomeLeadPro SaaS Multiempresa
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
    -- Calculate balance *before* this transaction + this transaction's amount
    select public.get_organization_credit_balance(new.organization_id) into running_balance;
    
    running_balance := running_balance + new.amount;
    
    if running_balance < 0 then
        raise exception 'Operação cancelada: Saldo insuficiente. Saldo atual: $, novo saldo: $', 
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

-- 3. Transacted debit of lead credits
create or replace function public.debit_lead_distribution()
returns trigger
security definer
language plpgsql
as $$
declare
    lead_price numeric;
    current_bal numeric;
begin
    -- Retrieve price charged
    lead_price := new.price_charged;
    
    -- Check current balance
    current_bal := public.get_organization_credit_balance(new.organization_id);
    
    if current_bal < lead_price then
        raise exception 'Falha na distribuição: Empresa % não possui créditos suficientes.', new.organization_id;
    end if;
    
    -- Insert debit entry into ledger
    insert into public.organization_credit_ledger (
        organization_id,
        amount,
        transaction_type,
        reference_type,
        reference_id,
        description
    ) values (
        new.organization_id,
        -lead_price,
        'lead_debit',
        'lead_distribution',
        new.id,
        'Cobrança automática por recebimento de lead.'
    );
    
    -- Update lead status to distributed/charged
    update public.leads 
    set status = 'Contacted', organization_id = new.organization_id
    where id = new.lead_id;
    
    return new;
end;
$$;

drop trigger if exists trg_lead_distribution_debit on public.lead_distributions;
create trigger trg_lead_distribution_debit
after insert on public.lead_distributions
for each row
execute function public.debit_lead_distribution();

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
-- 🤝 COMPANY PARTNERS percentage validation (soma = 100%)
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
