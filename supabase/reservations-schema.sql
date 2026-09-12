-- ─────────────────────────────────────────────────────────────────────────────
-- RESERVATIONS FEATURE — run this once in Supabase → SQL Editor.
-- Wires up the reservation/payment feature per BACKEND_INTEGRATION.md.
-- Safe to run even if some of this already exists (uses IF NOT EXISTS / OR REPLACE).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Table ─────────────────────────────────────────────────────────────────
create table if not exists public.reservations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users (id) on delete set null,
  applicant_name    text not null,
  email             text,
  contact_number    text,
  block_id          text references public.blocks (id) on delete set null,
  block_name        text,
  lawn_name         text,
  lot_id            text,
  lot_no            integer,
  classification    text,
  price             numeric,
  reservation_date  date,
  payment_option    text check (payment_option in ('cash', 'installment')),
  notes             text,
  status            text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists reservations_user_id_idx on public.reservations (user_id);

alter table public.reservations enable row level security;

drop policy if exists "Users insert their own reservations" on public.reservations;
create policy "Users insert their own reservations"
  on public.reservations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users view own, admins view all" on public.reservations;
create policy "Users view own, admins view all"
  on public.reservations for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users update own, admins update all" on public.reservations;
create policy "Users update own, admins update all"
  on public.reservations for update
  using (auth.uid() = user_id or public.is_admin());

drop trigger if exists reservations_touch_updated_at on public.reservations;
create trigger reservations_touch_updated_at
  before update on public.reservations
  for each row execute procedure public.touch_updated_at();

-- ── 2. Atomic RPCs ───────────────────────────────────────────────────────────
-- Per BACKEND_INTEGRATION.md: confirming/creating a reservation must flip the
-- lot's status in the SAME transaction as the reservation write, not as a
-- separate client-side call, so the two can't drift apart under concurrent
-- users. `for update` locks the lot row so two people can't both reserve it
-- at once — a real guarantee, not just the frontend's advisory check.

create or replace function public.create_reservation(
  p_applicant_name   text,
  p_email            text,
  p_contact_number   text,
  p_block_id         text,
  p_lot_no           integer,
  p_classification   text,
  p_price            numeric,
  p_reservation_date date,
  p_payment_option   text,
  p_notes            text
)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  v_lot   public.lots;
  v_block public.blocks;
  v_row   public.reservations;
begin
  select * into v_lot from public.lots
    where block_id = p_block_id and lot_no = p_lot_no
    for update;

  if not found then
    raise exception 'Lot not found.';
  end if;
  if v_lot.status <> 'available' then
    raise exception 'This lot is no longer available for reservation.';
  end if;

  select * into v_block from public.blocks where id = p_block_id;

  insert into public.reservations (
    user_id, applicant_name, email, contact_number, block_id, block_name, lawn_name,
    lot_id, lot_no, classification, price, reservation_date, payment_option, notes, status
  ) values (
    auth.uid(), p_applicant_name, p_email, p_contact_number, p_block_id,
    coalesce(v_block.name, p_block_id), v_block.lawn_name,
    v_lot.id, p_lot_no, coalesce(p_classification, v_lot.classification), p_price,
    p_reservation_date, p_payment_option, p_notes, 'pending'
  ) returning * into v_row;

  update public.lots set status = 'reserve_lot' where id = v_lot.id;

  return v_row;
end;
$$;

-- Admin-only: confirm/reject/cancel a reservation and mirror the change onto
-- the lot (confirmed → sold, rejected/cancelled → back to available).
create or replace function public.set_reservation_status(p_reservation_id uuid, p_status text)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.reservations;
begin
  if not public.is_admin() then
    raise exception 'Only admins can update reservation status.';
  end if;

  update public.reservations set status = p_status
    where id = p_reservation_id
    returning * into v_row;

  if not found then
    raise exception 'Reservation not found.';
  end if;

  if p_status = 'confirmed' then
    update public.lots set status = 'sold' where id = v_row.lot_id;
  elsif p_status in ('rejected', 'cancelled') then
    update public.lots set status = 'available' where id = v_row.lot_id and status = 'reserve_lot';
  end if;

  return v_row;
end;
$$;

-- User-initiated cancel (own reservation only) — same lot-freeing behavior
-- as above, but authorized by ownership instead of admin role.
create or replace function public.cancel_my_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.reservations;
begin
  select * into v_row from public.reservations where id = p_reservation_id;
  if not found then
    raise exception 'Reservation not found.';
  end if;
  if v_row.user_id <> auth.uid() then
    raise exception 'Not authorized to cancel this reservation.';
  end if;

  update public.reservations set status = 'cancelled'
    where id = p_reservation_id
    returning * into v_row;

  update public.lots set status = 'available' where id = v_row.lot_id and status = 'reserve_lot';

  return v_row;
end;
$$;
