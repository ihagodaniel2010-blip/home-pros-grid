-- Seed inicial mínimo para Fase 5.6
-- Tabelas: service_tasks, service_question_flows
-- NÃO APLICAR AUTOMATICAMENTE

do $$
declare
    v_flooring_id uuid;
    v_carpentry_id uuid;
    v_plumbing_id uuid;
    v_drywall_id uuid;
begin
    -- Assegurar categorias e obter IDs
    insert into public.service_categories (name, slug, active) values ('Flooring & Carpet', 'flooring-carpet', true) on conflict (slug) do nothing;
    insert into public.service_categories (name, slug, active) values ('Carpentry', 'carpentry', true) on conflict (slug) do nothing;
    insert into public.service_categories (name, slug, active) values ('Plumbing', 'plumbing', true) on conflict (slug) do nothing;
    insert into public.service_categories (name, slug, active) values ('Drywall & Plaster', 'drywall-plaster', true) on conflict (slug) do nothing;

    select id into v_flooring_id from public.service_categories where slug = 'flooring-carpet';
    select id into v_carpentry_id from public.service_categories where slug = 'carpentry';
    select id into v_plumbing_id from public.service_categories where slug = 'plumbing';
    select id into v_drywall_id from public.service_categories where slug = 'drywall-plaster';

    -- 1. Inserir Tasks
    -- Flooring
    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_flooring_id, 'laminate-wood-stone-floor-install-materials-provided', 'Laminate Wood or Stone Floor - Install - Materials Provided by Consumer', 15, 60, 30, true),
    (v_flooring_id, 'laminate-wood-stone-floor-install-no-materials', 'Laminate Wood or Stone Floor - Install - Materials Not Provided by Consumer', 20, 80, 40, true),
    (v_flooring_id, 'laminate-wood-stone-floor-repair', 'Laminate Wood or Stone Floor - Repair', 10, 40, 20, true),
    (v_flooring_id, 'luxury-vinyl-flooring-install-materials-provided', 'Luxury Vinyl Flooring - Install - Materials Provided by Consumer', 15, 60, 30, true),
    (v_flooring_id, 'luxury-vinyl-flooring-install-no-materials', 'Luxury Vinyl Flooring - Install - Materials Not Provided by Consumer', 20, 80, 40, true),
    (v_flooring_id, 'luxury-vinyl-flooring-repair', 'Luxury Vinyl Flooring - Repair', 10, 40, 20, true),
    (v_flooring_id, 'wood-flooring-install', 'Wood Flooring - Install or Completely Replace', 30, 120, 50, true),
    (v_flooring_id, 'wood-flooring-refinish', 'Wood Flooring - Refinish', 25, 100, 45, true)
    on conflict (slug) do nothing;

    -- Carpentry
    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_carpentry_id, 'deck-or-porch-repair', 'Deck or Porch - Repair', 21, 46, 30, true),
    (v_carpentry_id, 'exterior-trim-install', 'Exterior Trim - Install or Replace', 33, 77, 45, true),
    (v_carpentry_id, 'exterior-trim-repair', 'Exterior Trim - Repair', 17, 30, 25, true),
    (v_carpentry_id, 'wood-fence-install', 'Wood Fence - Install', 50, 107, 75, true),
    (v_carpentry_id, 'wood-fence-repair', 'Wood Fence - Repair', 20, 39, 30, true),
    (v_carpentry_id, 'wood-stairs-railings-repair', 'Wood Stairs and Railings - Repair', 12, 27, 20, true)
    on conflict (slug) do nothing;

    -- Plumbing
    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_plumbing_id, 'toilet-repair-install', 'Toilet Repair / Install', 15, 50, 25, true),
    (v_plumbing_id, 'faucet-repair-install', 'Faucet Repair / Install', 15, 45, 20, true),
    (v_plumbing_id, 'sink-repair-install', 'Sink Repair / Install', 20, 60, 30, true),
    (v_plumbing_id, 'shower-repair-install', 'Shower Repair / Install', 25, 75, 40, true),
    (v_plumbing_id, 'drain-cleaning', 'Drain Cleaning', 15, 40, 25, true)
    on conflict (slug) do nothing;

    -- Drywall
    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_drywall_id, 'drywall-install', 'Drywall - Install', 30, 100, 50, true),
    (v_drywall_id, 'drywall-repair', 'Drywall - Repair', 15, 50, 25, true),
    (v_drywall_id, 'ceiling-repair', 'Ceiling Repair', 20, 60, 30, true),
    (v_drywall_id, 'plaster-repair', 'Plaster - Repair', 25, 70, 35, true)
    on conflict (slug) do nothing;

    -- 2. Inserir Question Flows
    -- Limpar fluxos anteriores para evitar duplicatas em re-runs de seed
    delete from public.service_question_flows;

    -- Flooring Flow
    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('flooring-carpet', 1, 'project_type', 'What best describes this flooring project?', 'radio', 
     '[{"label": "Install or replace flooring", "value": "install", "priority": 10},
       {"label": "Repair flooring", "value": "repair", "priority": 10, "task_hint": "-repair"},
       {"label": "Refinish flooring", "value": "refinish", "priority": 10, "maps_to_task_slug": "wood-flooring-refinish"},
       {"label": "Other", "value": "other", "priority": 1}]'::jsonb),
       
    ('flooring-carpet', 2, 'flooring_type', 'Select the type of flooring:', 'radio',
     '[{"label": "Hardwood", "value": "hardwood", "priority": 5, "maps_to_task_slug": "wood-flooring-install"},
       {"label": "Wood laminate", "value": "laminate", "priority": 5, "task_hint": "laminate-wood"},
       {"label": "Luxury vinyl", "value": "luxury-vinyl", "priority": 5, "task_hint": "luxury-vinyl"},
       {"label": "Want recommendation", "value": "recommendation", "priority": 1},
       {"label": "Other", "value": "other", "priority": 1}]'::jsonb),

    ('flooring-carpet', 3, 'materials', 'Have you already purchased the materials?', 'radio',
     '[{"label": "Yes", "value": "yes", "priority": 2, "task_hint": "-materials-provided"},
       {"label": "No", "value": "no", "priority": 2, "task_hint": "-no-materials"},
       {"label": "Other", "value": "other", "priority": 1}]'::jsonb);

    -- Carpentry Flow
    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('carpentry', 1, 'project_type', 'What needs to be done?', 'radio',
     '[{"label": "Repair Deck or Porch", "value": "deck_repair", "maps_to_task_slug": "deck-or-porch-repair"},
       {"label": "Install or Replace Exterior Trim", "value": "trim_install", "maps_to_task_slug": "exterior-trim-install"},
       {"label": "Repair Exterior Trim", "value": "trim_repair", "maps_to_task_slug": "exterior-trim-repair"},
       {"label": "Install Wood Fence", "value": "fence_install", "maps_to_task_slug": "wood-fence-install"},
       {"label": "Repair Wood Fence", "value": "fence_repair", "maps_to_task_slug": "wood-fence-repair"},
       {"label": "Repair Wood Stairs", "value": "stairs_repair", "maps_to_task_slug": "wood-stairs-railings-repair"},
       {"label": "Other", "value": "other", "priority": 1}]'::jsonb);

    -- Plumbing Flow
    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('plumbing', 1, 'project_type', 'What plumbing service do you need?', 'radio',
     '[{"label": "Toilet Repair / Install", "value": "toilet", "maps_to_task_slug": "toilet-repair-install"},
       {"label": "Faucet Repair / Install", "value": "faucet", "maps_to_task_slug": "faucet-repair-install"},
       {"label": "Sink Repair / Install", "value": "sink", "maps_to_task_slug": "sink-repair-install"},
       {"label": "Shower Repair / Install", "value": "shower", "maps_to_task_slug": "shower-repair-install"},
       {"label": "Drain Cleaning", "value": "drain", "maps_to_task_slug": "drain-cleaning"},
       {"label": "Other", "value": "other"}]'::jsonb);

    -- Drywall Flow
    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('drywall-plaster', 1, 'project_type', 'What do you need help with?', 'radio',
     '[{"label": "Install Drywall", "value": "install", "maps_to_task_slug": "drywall-install"},
       {"label": "Repair Drywall", "value": "repair_drywall", "maps_to_task_slug": "drywall-repair"},
       {"label": "Repair Ceiling", "value": "repair_ceiling", "maps_to_task_slug": "ceiling-repair"},
       {"label": "Repair Plaster", "value": "repair_plaster", "maps_to_task_slug": "plaster-repair"},
       {"label": "Other", "value": "other"}]'::jsonb);

end;
$$;
