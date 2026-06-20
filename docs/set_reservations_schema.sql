create extension if not exists pgcrypto;

create table if not exists public.set_reservations (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  game_type text not null check (game_type in ('sanma', 'yonma', 'other')),
  duration_minutes integer check (duration_minutes is null or duration_minutes in (180, 240, 300)),
  people_count integer check (people_count is null or people_count in (4, 5, 6)),
  table_count integer not null default 1 check (table_count in (1, 2)),
  confirmation_email_sent_at timestamptz,
  cancellation_email_sent_at timestamptz,
  customer_name text not null,
  contact text not null,
  email text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  source text not null default 'web' check (source in ('web', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.set_reservations
  add column if not exists email text;

update public.set_reservations
set email = ''
where email is null;

alter table public.set_reservations
  alter column email set not null;

alter table public.set_reservations
  alter column people_count drop not null;

alter table public.set_reservations
  add column if not exists table_count integer not null default 1;

alter table public.set_reservations
  add column if not exists confirmation_email_sent_at timestamptz;

alter table public.set_reservations
  add column if not exists cancellation_email_sent_at timestamptz;

alter table public.set_reservations
  add column if not exists source text not null default 'web';

alter table public.set_reservations
  drop constraint if exists set_reservations_source_check;

alter table public.set_reservations
  add constraint set_reservations_source_check check (source in ('web', 'manual'));

alter table public.set_reservations
  drop constraint if exists set_reservations_table_count_check;

alter table public.set_reservations
  add constraint set_reservations_table_count_check check (table_count in (1, 2));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_reservations_set_updated_at on public.set_reservations;
create trigger set_reservations_set_updated_at
before update on public.set_reservations
for each row execute function public.set_updated_at();

create index if not exists set_reservations_date_start_time_idx
  on public.set_reservations(date, start_time);

create index if not exists set_reservations_status_date_idx
  on public.set_reservations(status, date);

alter table public.set_reservations enable row level security;

drop policy if exists "anon insert set_reservations" on public.set_reservations;
create policy "anon insert set_reservations"
on public.set_reservations for insert to anon
with check (status = 'pending');

drop policy if exists "anon read set_reservations" on public.set_reservations;
create policy "anon read set_reservations"
on public.set_reservations for select to anon
using (true);

drop policy if exists "anon update set_reservations" on public.set_reservations;
create policy "anon update set_reservations"
on public.set_reservations for update to anon
using (true)
with check (status in ('pending', 'confirmed', 'cancelled'));

drop policy if exists "authenticated manage set_reservations" on public.set_reservations;
create policy "authenticated manage set_reservations"
on public.set_reservations for all to authenticated
using (true)
with check (true);

grant select, insert, update on public.set_reservations to anon;
grant select, insert, update, delete on public.set_reservations to authenticated;
