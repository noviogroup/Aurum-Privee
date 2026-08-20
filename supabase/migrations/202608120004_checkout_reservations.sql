create table if not exists public.checkout_reservations (
  id uuid primary key default gen_random_uuid(),
  checkout_reference uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  stripe_session_id text,
  status text not null default 'active' check (status in ('active', 'converted', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkout_reference, product_id)
);

create index if not exists checkout_reservations_active_product_idx
  on public.checkout_reservations (product_id, expires_at) where status = 'active';
create index if not exists checkout_reservations_stripe_session_idx
  on public.checkout_reservations (stripe_session_id) where stripe_session_id is not null;

alter table public.checkout_reservations enable row level security;
revoke all on public.checkout_reservations from anon, authenticated;

drop trigger if exists checkout_reservations_touch_updated_at on public.checkout_reservations;
create trigger checkout_reservations_touch_updated_at before update on public.checkout_reservations
for each row execute function public.touch_updated_at();

create or replace function public.reserve_checkout_inventory(
  p_checkout_reference uuid,
  p_items jsonb,
  p_expires_at timestamptz
)
returns table (product_id uuid, reserved_quantity integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_stock numeric;
  v_reserved numeric;
begin
  if p_checkout_reference is null then raise exception 'Checkout reference is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one checkout item is required'; end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '24 hours' then raise exception 'Invalid reservation expiry'; end if;

  update public.checkout_reservations set status = 'expired'
    where status = 'active' and expires_at <= now();

  for v_item in
    select parsed.product_id, sum(parsed.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as parsed(product_id uuid, quantity integer)
    group by parsed.product_id
    order by parsed.product_id
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 10 then
      raise exception 'Invalid checkout quantity';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v_item.product_id::text, 0));
    select p.stock into v_stock from public.products p
      where p.id = v_item.product_id and p.active = true for update;
    if not found then raise exception 'A checkout product is unavailable'; end if;
    select coalesce(sum(r.quantity), 0) into v_reserved
      from public.checkout_reservations r
      where r.product_id = v_item.product_id and r.status = 'active' and r.expires_at > now();
    if v_stock - v_reserved < v_item.quantity then raise exception 'A checkout product no longer has enough stock'; end if;

    insert into public.checkout_reservations (checkout_reference, product_id, quantity, expires_at)
    values (p_checkout_reference, v_item.product_id, v_item.quantity, p_expires_at);
    product_id := v_item.product_id;
    reserved_quantity := v_item.quantity;
    return next;
  end loop;
end;
$$;

create or replace function public.release_checkout_inventory(
  p_checkout_reference uuid,
  p_status text default 'released'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  if p_status not in ('released', 'expired') then raise exception 'Invalid reservation release status'; end if;
  update public.checkout_reservations set status = p_status
    where checkout_reference = p_checkout_reference and status = 'active';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.convert_checkout_inventory(p_checkout_reference uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_count integer := 0;
begin
  for v_item in
    select r.product_id, sum(r.quantity)::integer as quantity
    from public.checkout_reservations r
    where r.checkout_reference = p_checkout_reference and r.status = 'active'
    group by r.product_id
    order by r.product_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_item.product_id::text, 0));
    update public.products set stock = greatest(0, stock - v_item.quantity)
      where id = v_item.product_id;
    v_count := v_count + v_item.quantity;
  end loop;
  update public.checkout_reservations set status = 'converted'
    where checkout_reference = p_checkout_reference and status = 'active';
  return v_count;
end;
$$;

create or replace function public.expire_checkout_inventory()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  update public.checkout_reservations set status = 'expired'
    where status = 'active' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reserve_checkout_inventory(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.release_checkout_inventory(uuid, text) from public, anon, authenticated;
revoke all on function public.convert_checkout_inventory(uuid) from public, anon, authenticated;
revoke all on function public.expire_checkout_inventory() from public, anon, authenticated;
grant execute on function public.reserve_checkout_inventory(uuid, jsonb, timestamptz) to service_role;
grant execute on function public.release_checkout_inventory(uuid, text) to service_role;
grant execute on function public.convert_checkout_inventory(uuid) to service_role;
grant execute on function public.expire_checkout_inventory() to service_role;

alter table public.orders add column if not exists checkout_reference uuid;
create unique index if not exists orders_checkout_reference_idx on public.orders (checkout_reference) where checkout_reference is not null;
