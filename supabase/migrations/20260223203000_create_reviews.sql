create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  user_avatar_url text,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reviews_created_at on public.reviews (created_at desc);
create index if not exists idx_reviews_rating on public.reviews (rating);
create index if not exists idx_reviews_user_id on public.reviews (user_id);

drop trigger if exists trg_reviews_set_updated_at on public.reviews;
create trigger trg_reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "Public reviews visible" on public.reviews;
create policy "Public reviews visible"
on public.reviews
for select
using (is_hidden = false);

drop policy if exists "Users can insert own reviews" on public.reviews;
create policy "Users can insert own reviews"
on public.reviews
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own reviews" on public.reviews;
create policy "Users can update own reviews"
on public.reviews
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reviews" on public.reviews;
create policy "Users can delete own reviews"
on public.reviews
for delete
using (auth.uid() = user_id);
