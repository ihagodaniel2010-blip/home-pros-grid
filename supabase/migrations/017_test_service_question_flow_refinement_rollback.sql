-- Rollback Test for Migration 017
-- MUST BE EXECUTED INSIDE A TRANSACTION AND END WITH ROLLBACK

BEGIN;

-- 1. Test insertion of new categories
insert into public.service_categories (name, slug, active) values ('Test Roofing', 'test-roofing', true) on conflict (slug) do nothing;
insert into public.service_categories (name, slug, active) values ('Test Painting', 'test-painting', true) on conflict (slug) do nothing;
insert into public.service_categories (name, slug, active) values ('Test Remodeling', 'test-remodeling', true) on conflict (slug) do nothing;

-- 2. Verify existence
do $$
declare
    v_count integer;
begin
    select count(*) into v_count from public.service_categories where slug in ('test-roofing', 'test-painting', 'test-remodeling');
    if v_count <> 3 then
        raise exception 'Rollback test failed: categories not inserted correctly';
    end if;
    raise notice 'Rollback test validation succeeded. Executing ROLLBACK...';
end;
$$;

ROLLBACK;
