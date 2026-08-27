-- ─────────────────────────────────────────────────────────────────────────────
-- GraveLocator PWA — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. PROFILES (extends Supabase's built-in auth.users) ─────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. BLOCKS (the 9 cemetery blocks + their map hotspots) ──────────────────
create table if not exists public.blocks (
  id              text primary key,       -- e.g. 'block-3'
  name            text not null,
  lawn_name       text,
  has_grid        boolean not null default false,
  max_lot         integer,
  grid_cols       integer,
  classifications text[] not null default '{}',
  sub_areas       text[],
  batches         integer[],
  counts          jsonb,
  label_x         numeric not null,
  label_y         numeric not null,
  hotspot         jsonb not null          -- [[x,y], ...] percentage polygon
);

alter table public.blocks enable row level security;

drop policy if exists "Blocks are viewable by everyone" on public.blocks;
create policy "Blocks are viewable by everyone"
  on public.blocks for select
  using (true);

drop policy if exists "Blocks are editable by admins" on public.blocks;
create policy "Blocks are editable by admins"
  on public.blocks for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── 3. LOTS (the core, frequently-changing table — status per lot) ──────────
create table if not exists public.lots (
  id               text primary key,       -- e.g. 'block-3-204' or 'block-3-x0'
  block_id         text not null references public.blocks (id) on delete cascade,
  lot_no           integer,                 -- null for number-less coloured cells
  classification   text not null,
  status           text not null default 'available'
                     check (status in (
                       'available','sold','with_interment','reserve_lot',
                       'not_for_sale','delinquent','trees','lamp_post','block_off'
                     )),
  interment_count  integer not null default 0,
  verified         boolean not null default false,
  updated_at       timestamptz not null default now()
);

create index if not exists lots_block_id_idx on public.lots (block_id);

alter table public.lots enable row level security;

drop policy if exists "Lots are viewable by everyone" on public.lots;
create policy "Lots are viewable by everyone"
  on public.lots for select
  using (true);

drop policy if exists "Lots are editable by admins" on public.lots;
create policy "Lots are editable by admins"
  on public.lots for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- keep updated_at fresh on every status change
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lots_touch_updated_at on public.lots;
create trigger lots_touch_updated_at
  before update on public.lots
  for each row execute procedure public.touch_updated_at();

-- ── 4. MEMORIALS (user-submitted digital tributes) ──────────────────────────
create table if not exists public.memorials (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  emoji       text not null default '🕊️',
  name        text not null,
  dates       text,
  quote       text,
  likes       integer not null default 0,
  comments    integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.memorials enable row level security;

drop policy if exists "Memorials are viewable by everyone" on public.memorials;
create policy "Memorials are viewable by everyone"
  on public.memorials for select
  using (true);

drop policy if exists "Authenticated users can create memorials" on public.memorials;
create policy "Authenticated users can create memorials"
  on public.memorials for insert
  with check (auth.uid() = user_id);

drop policy if exists "Owners or admins can update memorials" on public.memorials;
create policy "Owners or admins can update memorials"
  on public.memorials for update
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Next: run seed.sql (or seed.js) to load the existing block/lot/memorial
-- data so the app isn't starting from an empty database.
-- ─────────────────────────────────────────────────────────────────────────────
