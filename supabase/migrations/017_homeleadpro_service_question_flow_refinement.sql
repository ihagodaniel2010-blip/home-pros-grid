-- Migration 017: Refinement of Service Categories, Tasks, and Question Flows for H&A Construction
-- DO NOT EXECUTE AUTOMATICALLY - PROPOSED FOR PHASE 8.2

do $$
declare
    v_roofing_id uuid;
    v_painting_id uuid;
    v_remodeling_id uuid;
begin
    -- 1. Ensure categories exist (UPSERT by unique slug)
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

    -- 2. Insert or update Tasks for Roofing, Painting, Remodeling (UPSERT by unique slug)
    -- Roofing
    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_roofing_id, 'roof-replacement', 'Roof Replacement or Complete Overhaul', 40, 150, 80, true),
    (v_roofing_id, 'roof-repair-leak', 'Roof Repair or Leak Inspection', 20, 65, 35, true),
    (v_roofing_id, 'shingle-roofing', 'Shingle Roof Installation / Repair', 25, 75, 45, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        active = true;

    -- Painting
    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_painting_id, 'interior-painting', 'Interior Painting - Rooms or Whole House', 20, 70, 40, true),
    (v_painting_id, 'exterior-painting', 'Exterior Painting - House Siding or Trim', 30, 90, 55, true),
    (v_painting_id, 'cabinet-painting', 'Cabinet Painting or Refinishing', 25, 80, 45, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        active = true;

    -- Remodeling
    insert into public.service_tasks (category_id, slug, name, min_lead_price, max_lead_price, default_lead_price, active) values
    (v_remodeling_id, 'kitchen-remodel-full', 'Full Kitchen Remodel & Custom Cabinets', 50, 200, 100, true),
    (v_remodeling_id, 'bathroom-remodel-full', 'Full Bathroom Remodel & Tile', 40, 160, 85, true),
    (v_remodeling_id, 'basement-finishing', 'Basement Finishing or Conversion', 45, 180, 90, true)
    on conflict (slug) do update set
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        active = true;

    -- 3. Idempotent question flows management (delete only target category flows before re-inserting)
    delete from public.service_question_flows where category_slug in ('roofing', 'painting', 'remodeling');

    -- Roofing Flow
    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('roofing', 1, 'project_type', 'What roofing service do you need?', 'radio',
     '[{"label": "Complete Roof Replacement", "value": "replacement", "maps_to_task_slug": "roof-replacement"},
       {"label": "Roof Repair / Fix Leak", "value": "repair", "maps_to_task_slug": "roof-repair-leak"},
       {"label": "Shingle Installation / Repair", "value": "shingle", "maps_to_task_slug": "shingle-roofing"},
       {"label": "Other Roofing Project", "value": "other"}]'::jsonb);

    -- Painting Flow
    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('painting', 1, 'project_type', 'What painting service do you need?', 'radio',
     '[{"label": "Interior Painting", "value": "interior", "maps_to_task_slug": "interior-painting"},
       {"label": "Exterior Painting", "value": "exterior", "maps_to_task_slug": "exterior-painting"},
       {"label": "Cabinet Painting / Refinishing", "value": "cabinet", "maps_to_task_slug": "cabinet-painting"},
       {"label": "Other Painting Project", "value": "other"}]'::jsonb);

    -- Remodeling Flow
    insert into public.service_question_flows (category_slug, step_order, question_key, question_text, input_type, options) values
    ('remodeling', 1, 'project_type', 'What remodeling project are you planning?', 'radio',
     '[{"label": "Full Kitchen Remodel", "value": "kitchen", "maps_to_task_slug": "kitchen-remodel-full"},
       {"label": "Full Bathroom Remodel", "value": "bathroom", "maps_to_task_slug": "bathroom-remodel-full"},
       {"label": "Basement Finishing / Remodel", "value": "basement", "maps_to_task_slug": "basement-finishing"},
       {"label": "Other Custom Remodel", "value": "other"}]'::jsonb);

end;
$$;
