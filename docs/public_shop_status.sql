create table if not exists public.public_shop_status (
  date date primary key,
  set_status text not null default 'ask'
    check (set_status in ('available', 'full', 'ask')),
  free_status_override text not null default 'auto'
    check (free_status_override in ('auto', 'available', 'possible', 'ask', 'closed')),
  public_note text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists public_shop_status_set_updated_at on public.public_shop_status;
create trigger public_shop_status_set_updated_at
before update on public.public_shop_status
for each row execute function public.set_updated_at();

alter table public.public_shop_status enable row level security;

create policy "authenticated read public_shop_status"
on public.public_shop_status for select to authenticated using (true);

create policy "authenticated write public_shop_status"
on public.public_shop_status for all to authenticated using (true) with check (true);
