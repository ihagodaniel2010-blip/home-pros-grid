-- Rollback Test for Migration 017
-- MUST BE EXECUTED INSIDE A TRANSACTION AND END WITH ROLLBACK

BEGIN;

-- 1. Execute Migration 017 Logic (First Run)
do $$
declare
    v_roofing_id uuid;
    v_painting_id uuid;
    v_remodeling_id uuid;
begin
    insert into public.service_categories (name, slug, active)
    values ('Roofing', 'roofing', true)
    on conflict (slug) do update set name = EXCLUDED.name, active = true;

    insert into public.service_categories (name, slug, active)
    values ('Painting', 'painting', true)
    on conflict (slug) do update set name = EXCLUDED.name, active = true;

    insert into public.service_categories (name, slug, active)
    values ('Remodeling', 'remodeling', true)
    on conflict (slug) do update set name = EXCLUDED.name, active = true;

    select id into v_roofing_id from public.service_categories where slug = 'roofing';
    select id into v_painting_id from public.service_categories where slug = 'painting';
    select id into v_remodeling_id from public.service_categories where slug = 'remodeling';

    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_roofing_id, 'roof-replacement', 'Roof Replacement or Complete Overhaul', 40, 150, 80, true),
    (v_roofing_id, 'roof-repair-leak', 'Roof Repair or Leak Inspection', 20, 65, 35, true),
    (v_roofing_id, 'shingle-roofing', 'Shingle Roof Installation / Repair', 25, 75, 45, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        min_lead_price = EXCLUDED.min_lead_price,
        max_lead_price = EXCLUDED.max_lead_price,
        default_lead_price = EXCLUDED.default_lead_price,
        active = true;

    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_painting_id, 'interior-painting', 'Interior Painting - Rooms or Whole House', 20, 70, 40, true),
    (v_painting_id, 'exterior-painting', 'Exterior Painting - House Siding or Trim', 30, 90, 55, true),
    (v_painting_id, 'cabinet-painting', 'Cabinet Painting or Refinishing', 25, 80, 45, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        min_lead_price = EXCLUDED.min_lead_price,
        max_lead_price = EXCLUDED.max_lead_price,
        default_lead_price = EXCLUDED.default_lead_price,
        active = true;

    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_remodeling_id, 'kitchen-remodel-full', 'Full Kitchen Remodel & Custom Cabinets', 50, 200, 100, true),
    (v_remodeling_id, 'bathroom-remodel-full', 'Full Bathroom Remodel & Tile', 40, 160, 85, true),
    (v_remodeling_id, 'basement-finishing', 'Basement Finishing or Conversion', 45, 180, 90, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        min_lead_price = EXCLUDED.min_lead_price,
        max_lead_price = EXCLUDED.max_lead_price,
        default_lead_price = EXCLUDED.default_lead_price,
        active = true;

    delete from public.service_question_flows where category_slug in ('roofing', 'painting', 'remodeling');

    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('roofing', 1, 'project_type', 'What roofing service do you need?', 'radio',
     '[{"label": "Complete Roof Replacement", "value": "replacement", "maps_to_task_slug": "roof-replacement"},
       {"label": "Roof Repair / Fix Leak", "value": "repair", "maps_to_task_slug": "roof-repair-leak"},
       {"label": "Shingle Installation / Repair", "value": "shingle", "maps_to_task_slug": "shingle-roofing"},
       {"label": "Other Roofing Project", "value": "other"}]'::jsonb);

    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('painting', 1, 'project_type', 'What painting service do you need?', 'radio',
     '[{"label": "Interior Painting", "value": "interior", "maps_to_task_slug": "interior-painting"},
       {"label": "Exterior Painting", "value": "exterior", "maps_to_task_slug": "exterior-painting"},
       {"label": "Cabinet Painting / Refinishing", "value": "cabinet", "maps_to_task_slug": "cabinet-painting"},
       {"label": "Other Painting Project", "value": "other"}]'::jsonb);

    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('remodeling', 1, 'project_type', 'What remodeling project are you planning?', 'radio',
     '[{"label": "Full Kitchen Remodel", "value": "kitchen", "maps_to_task_slug": "kitchen-remodel-full"},
       {"label": "Full Bathroom Remodel", "value": "bathroom", "maps_to_task_slug": "bathroom-remodel-full"},
       {"label": "Basement Finishing / Remodel", "value": "basement", "maps_to_task_slug": "basement-finishing"},
       {"label": "Other Custom Remodel", "value": "other"}]'::jsonb);
end;
$$;

-- 2. Execute Migration 017 Logic (Second Run - Idempotency Check)
do $$
declare
    v_roofing_id uuid;
    v_painting_id uuid;
    v_remodeling_id uuid;
begin
    insert into public.service_categories (name, slug, active)
    values ('Roofing', 'roofing', true)
    on conflict (slug) do update set name = EXCLUDED.name, active = true;

    insert into public.service_categories (name, slug, active)
    values ('Painting', 'painting', true)
    on conflict (slug) do update set name = EXCLUDED.name, active = true;

    insert into public.service_categories (name, slug, active)
    values ('Remodeling', 'remodeling', true)
    on conflict (slug) do update set name = EXCLUDED.name, active = true;

    select id into v_roofing_id from public.service_categories where slug = 'roofing';
    select id into v_painting_id from public.service_categories where slug = 'painting';
    select id into v_remodeling_id from public.service_categories where slug = 'remodeling';

    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_roofing_id, 'roof-replacement', 'Roof Replacement or Complete Overhaul', 40, 150, 80, true),
    (v_roofing_id, 'roof-repair-leak', 'Roof Repair or Leak Inspection', 20, 65, 35, true),
    (v_roofing_id, 'shingle-roofing', 'Shingle Roof Installation / Repair', 25, 75, 45, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        min_lead_price = EXCLUDED.min_lead_price,
        max_lead_price = EXCLUDED.max_lead_price,
        default_lead_price = EXCLUDED.default_lead_price,
        active = true;

    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_painting_id, 'interior-painting', 'Interior Painting - Rooms or Whole House', 20, 70, 40, true),
    (v_painting_id, 'exterior-painting', 'Exterior Painting - House Siding or Trim', 30, 90, 55, true),
    (v_painting_id, 'cabinet-painting', 'Cabinet Painting or Refinishing', 25, 80, 45, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        min_lead_price = EXCLUDED.min_lead_price,
        max_lead_price = EXCLUDED.max_lead_price,
        default_lead_price = EXCLUDED.default_lead_price,
        active = true;

    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_remodeling_id, 'kitchen-remodel-full', 'Full Kitchen Remodel & Custom Cabinets', 50, 200, 100, true),
    (v_remodeling_id, 'bathroom-remodel-full', 'Full Bathroom Remodel & Tile', 40, 160, 85, true),
    (v_remodeling_id, 'basement-finishing', 'Basement Finishing or Conversion', 45, 180, 90, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        min_lead_price = EXCLUDED.min_lead_price,
        max_lead_price = EXCLUDED.max_lead_price,
        default_lead_price = EXCLUDED.default_lead_price,
        active = true;

    delete from public.service_question_flows where category_slug in ('roofing', 'painting', 'remodeling');

    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('roofing', 1, 'project_type', 'What roofing service do you need?', 'radio',
     '[{"label": "Complete Roof Replacement", "value": "replacement", "maps_to_task_slug": "roof-replacement"},
       {"label": "Roof Repair / Fix Leak", "value": "repair", "maps_to_task_slug": "roof-repair-leak"},
       {"label": "Shingle Installation / Repair", "value": "shingle", "maps_to_task_slug": "shingle-roofing"},
       {"label": "Other Roofing Project", "value": "other"}]'::jsonb);

    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('painting', 1, 'project_type', 'What painting service do you need?', 'radio',
     '[{"label": "Interior Painting", "value": "interior", "maps_to_task_slug": "interior-painting"},
       {"label": "Exterior Painting", "value": "exterior", "maps_to_task_slug": "exterior-painting"},
       {"label": "Cabinet Painting / Refinishing", "value": "cabinet", "maps_to_task_slug": "cabinet-painting"},
       {"label": "Other Painting Project", "value": "other"}]'::jsonb);

    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('remodeling', 1, 'project_type', 'What remodeling project are you planning?', 'radio',
     '[{"label": "Full Kitchen Remodel", "value": "kitchen", "maps_to_task_slug": "kitchen-remodel-full"},
       {"label": "Full Bathroom Remodel", "value": "bathroom", "maps_to_task_slug": "bathroom-remodel-full"},
       {"label": "Basement Finishing / Remodel", "value": "basement", "maps_to_task_slug": "basement-finishing"},
       {"label": "Other Custom Remodel", "value": "other"}]'::jsonb);
end;
$$;

-- 3. Assertions & Validation
do $$
declare
    v_categories_count integer;
    v_tasks_count integer;
    v_flows_count integer;
    v_invalid_slugs_count integer;
begin
    select count(*) into v_categories_count
    from public.service_categories
    where slug in ('roofing', 'painting', 'remodeling');

    if v_categories_count <> 3 then
        raise exception 'Validation failed: expected 3 categories, found %', v_categories_count;
    end if;

    select count(*) into v_tasks_count
    from public.service_tasks
    where slug in (
        'roof-replacement', 'roof-repair-leak', 'shingle-roofing',
        'interior-painting', 'exterior-painting', 'cabinet-painting',
        'kitchen-remodel-full', 'bathroom-remodel-full', 'basement-finishing'
    );

    if v_tasks_count <> 9 then
        raise exception 'Validation failed: expected 9 tasks, found %', v_tasks_count;
    end if;

    select count(*) into v_flows_count
    from public.service_question_flows
    where category_slug in ('roofing', 'painting', 'remodeling');

    if v_flows_count <> 3 then
        raise exception 'Validation failed: expected 3 question flows, found %', v_flows_count;
    end if;

    select count(*) into v_invalid_slugs_count
    from (
        select jsonb_array_elements(options)->>'maps_to_task_slug' as task_slug
        from public.service_question_flows
        where category_slug in ('roofing', 'painting', 'remodeling')
    ) opts
    where task_slug is not null
      and task_slug not in (select slug from public.service_tasks);

    if v_invalid_slugs_count > 0 then
        raise exception 'Validation failed: found % option(s) with invalid maps_to_task_slug', v_invalid_slugs_count;
    end if;

    raise notice 'Rollback test validation SUCCEEDED! All 4 checks passed cleanly.';
end;
$$;

ROLLBACK;
