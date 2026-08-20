-- Durable abuse controls, confirmed newsletter consent, and atomic commerce/provider state transitions.

create table if not exists public.api_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at)
);

create index if not exists api_rate_limits_cleanup_idx on public.api_rate_limits (window_started_at);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_scope is null or length(p_scope) not between 1 and 100 then raise exception 'Invalid rate-limit scope'; end if;
  if p_key_hash is null or length(p_key_hash) <> 64 then raise exception 'Invalid rate-limit key'; end if;
  if p_limit < 1 or p_limit > 10000 then raise exception 'Invalid rate-limit maximum'; end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then raise exception 'Invalid rate-limit window'; end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.api_rate_limits (scope, key_hash, window_started_at, request_count)
    values (p_scope, p_key_hash, v_window, 1)
    on conflict (scope, key_hash, window_started_at)
    do update set request_count = public.api_rate_limits.request_count + 1, updated_at = now()
    returning request_count into v_count;

  allowed := v_count <= p_limit;
  remaining := greatest(0, p_limit - v_count);
  retry_after_seconds := greatest(1, ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::integer);
  return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

alter table public.checkout_reservations
  add column if not exists actor_key_hash text;
create index if not exists checkout_reservations_actor_active_idx
  on public.checkout_reservations (actor_key_hash, expires_at) where status = 'active';

drop function if exists public.reserve_checkout_inventory(uuid, jsonb, timestamptz);
create or replace function public.reserve_checkout_inventory(
  p_checkout_reference uuid,
  p_items jsonb,
  p_expires_at timestamptz,
  p_actor_key_hash text
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
  v_actor_units numeric;
begin
  if p_checkout_reference is null then raise exception 'Checkout reference is required'; end if;
  if p_actor_key_hash is null or length(p_actor_key_hash) <> 64 then raise exception 'Checkout actor is invalid'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then raise exception 'Invalid checkout item count'; end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '1 hour' then raise exception 'Invalid reservation expiry'; end if;

  perform pg_advisory_xact_lock(hashtextextended('checkout-actor:' || p_actor_key_hash, 0));
  update public.checkout_reservations set status = 'expired' where status = 'active' and expires_at <= now();
  select coalesce(sum(quantity), 0) into v_actor_units
    from public.checkout_reservations
    where actor_key_hash = p_actor_key_hash and status = 'active' and expires_at > now();
  if v_actor_units + coalesce((select sum((entry->>'quantity')::integer) from jsonb_array_elements(p_items) entry), 0) > 12 then
    raise exception 'Too many active checkout items';
  end if;

  for v_item in
    select parsed.product_id, sum(parsed.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as parsed(product_id uuid, quantity integer)
    group by parsed.product_id
    order by parsed.product_id
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 10 then raise exception 'Invalid checkout quantity'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_item.product_id::text, 0));
    select p.stock into v_stock from public.products p where p.id = v_item.product_id and p.active = true for update;
    if not found then raise exception 'A checkout product is unavailable'; end if;
    select coalesce(sum(r.quantity), 0) into v_reserved
      from public.checkout_reservations r
      where r.product_id = v_item.product_id and r.status = 'active' and r.expires_at > now();
    if v_stock - v_reserved < v_item.quantity then raise exception 'A checkout product no longer has enough stock'; end if;

    insert into public.checkout_reservations (checkout_reference, product_id, quantity, expires_at, actor_key_hash)
      values (p_checkout_reference, v_item.product_id, v_item.quantity, p_expires_at, p_actor_key_hash);
    product_id := v_item.product_id;
    reserved_quantity := v_item.quantity;
    return next;
  end loop;
end;
$$;

revoke all on function public.reserve_checkout_inventory(uuid, jsonb, timestamptz, text) from public, anon, authenticated;
grant execute on function public.reserve_checkout_inventory(uuid, jsonb, timestamptz, text) to service_role;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'processed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;

drop function if exists public.convert_checkout_inventory(uuid);
create or replace function public.convert_checkout_inventory(
  p_checkout_reference uuid,
  p_stripe_session_id text,
  p_items jsonb
)
returns table (converted_quantity integer, state text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_count integer := 0;
  v_statuses text[];
  v_session_ids text[];
  v_expiry timestamptz;
begin
  if p_checkout_reference is null or p_stripe_session_id is null or length(p_stripe_session_id) < 8 then raise exception 'Invalid checkout finalization'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then raise exception 'Invalid paid checkout lines'; end if;
  perform pg_advisory_xact_lock(hashtextextended('checkout:' || p_checkout_reference::text, 0));

  perform 1 from public.checkout_reservations
    where checkout_reference = p_checkout_reference
    for update;
  select array_agg(distinct status), array_agg(distinct stripe_session_id), max(expires_at)
    into v_statuses, v_session_ids, v_expiry
    from public.checkout_reservations
    where checkout_reference = p_checkout_reference;

  if v_statuses is null then raise exception 'Checkout reservation does not exist'; end if;
  if array_length(v_session_ids, 1) <> 1 or v_session_ids[1] is distinct from p_stripe_session_id then raise exception 'Stripe session does not match reservation'; end if;
  if v_statuses <@ array['converted']::text[] then
    converted_quantity := 0;
    state := 'already_converted';
    return next;
    return;
  end if;
  if not (v_statuses <@ array['active']::text[]) or v_expiry <= now() then raise exception 'Checkout reservation is not active'; end if;
  if exists (
    (select product_id::text, sum(quantity)::integer from public.checkout_reservations where checkout_reference = p_checkout_reference group by product_id
     except
     select product_id::text, sum(quantity)::integer from jsonb_to_recordset(p_items) as paid(product_id uuid, quantity integer) group by product_id)
    union all
    (select product_id::text, sum(quantity)::integer from jsonb_to_recordset(p_items) as paid(product_id uuid, quantity integer) group by product_id
     except
     select product_id::text, sum(quantity)::integer from public.checkout_reservations where checkout_reference = p_checkout_reference group by product_id)
  ) then raise exception 'Paid checkout lines do not match reservation'; end if;

  for v_item in
    select r.product_id, sum(r.quantity)::integer as quantity
    from public.checkout_reservations r
    where r.checkout_reference = p_checkout_reference and r.status = 'active'
    group by r.product_id
    order by r.product_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_item.product_id::text, 0));
    update public.products set stock = stock - v_item.quantity
      where id = v_item.product_id and stock >= v_item.quantity;
    if not found then raise exception 'Reserved inventory cannot be fulfilled'; end if;
    v_count := v_count + v_item.quantity;
  end loop;
  if v_count <= 0 then raise exception 'No inventory was converted'; end if;
  update public.checkout_reservations set status = 'converted'
    where checkout_reference = p_checkout_reference and status = 'active';
  converted_quantity := v_count;
  state := 'converted';
  return next;
end;
$$;

revoke all on function public.convert_checkout_inventory(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.convert_checkout_inventory(uuid, text, jsonb) to service_role;

create or replace function public.claim_stripe_webhook_event(p_event_id text, p_event_type text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.stripe_webhook_events (event_id, event_type, status)
    values (p_event_id, p_event_type, 'processing')
    on conflict (event_id) do update set status = 'processing', error = null, updated_at = now()
      where public.stripe_webhook_events.status = 'failed'
         or (public.stripe_webhook_events.status = 'processing' and public.stripe_webhook_events.updated_at < now() - interval '10 minutes');
  return found;
end;
$$;
revoke all on function public.claim_stripe_webhook_event(text, text) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text) to service_role;

create or replace function public.claim_loyverse_webhook_event(
  p_event_hash text,
  p_event_type text,
  p_payload_created_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.loyverse_webhook_events (event_hash, event_type, status, payload_created_at)
    values (p_event_hash, p_event_type, 'processing', p_payload_created_at)
    on conflict (event_hash) do update set status = 'processing', error = null, updated_at = now()
      where public.loyverse_webhook_events.status = 'failed'
         or (public.loyverse_webhook_events.status = 'processing' and public.loyverse_webhook_events.updated_at < now() - interval '10 minutes');
  return found;
end;
$$;
revoke all on function public.claim_loyverse_webhook_event(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_loyverse_webhook_event(text, text, timestamptz) to service_role;

create or replace function public.claim_order_sync(p_order_id uuid, p_operation text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_claimed boolean;
begin
  if p_operation = 'sale' then
    update public.orders set loyverse_sync_status = 'processing', loyverse_sync_error = null
      where id = p_order_id and loyverse_sync_status in ('pending', 'failed');
  elsif p_operation = 'refund' then
    update public.orders set loyverse_refund_sync_status = 'processing', loyverse_refund_sync_error = null
      where id = p_order_id and loyverse_refund_sync_status in ('pending', 'failed');
  else
    raise exception 'Invalid synchronization operation';
  end if;
  v_claimed := found;
  return v_claimed;
end;
$$;
revoke all on function public.claim_order_sync(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_order_sync(uuid, text) to service_role;

alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_status_check;
alter table public.newsletter_subscribers
  add column if not exists confirmation_token_hash text,
  add column if not exists confirmation_expires_at timestamptz,
  add column if not exists consented_at timestamptz,
  add column if not exists unsubscribed_at timestamptz;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_status_check check (status in ('pending', 'subscribed', 'unsubscribed'));
create unique index if not exists newsletter_confirmation_token_idx
  on public.newsletter_subscribers (confirmation_token_hash) where confirmation_token_hash is not null;

create or replace function public.request_newsletter_confirmation(
  p_email text,
  p_source text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_status text;
begin
  if p_expires_at <= now() or p_expires_at > now() + interval '2 days' then raise exception 'Invalid confirmation expiry'; end if;
  select status into v_status from public.newsletter_subscribers where email = p_email for update;
  if v_status = 'subscribed' then return 'subscribed'; end if;
  insert into public.newsletter_subscribers (email, source, status, confirmation_token_hash, confirmation_expires_at)
    values (p_email, p_source, 'pending', p_token_hash, p_expires_at)
    on conflict (email) do update set
      source = excluded.source,
      status = 'pending',
      confirmation_token_hash = excluded.confirmation_token_hash,
      confirmation_expires_at = excluded.confirmation_expires_at;
  return 'pending';
end;
$$;

create or replace function public.confirm_newsletter_subscription(p_token_hash text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_email text;
begin
  update public.newsletter_subscribers
    set status = 'subscribed', consented_at = now(), unsubscribed_at = null,
        confirmation_token_hash = null, confirmation_expires_at = null
    where confirmation_token_hash = p_token_hash and status = 'pending' and confirmation_expires_at > now()
    returning email into v_email;
  return v_email;
end;
$$;

revoke all on function public.request_newsletter_confirmation(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.confirm_newsletter_subscription(text) from public, anon, authenticated;
grant execute on function public.request_newsletter_confirmation(text, text, text, timestamptz) to service_role;
grant execute on function public.confirm_newsletter_subscription(text) to service_role;

-- Product source timestamps are used as monotonic provider versions.
create or replace function public.apply_loyverse_inventory_level(
  p_variant_id text,
  p_stock numeric,
  p_source_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.products
    set stock = greatest(0, p_stock), source_updated_at = p_source_updated_at, synced_at = now()
    where loyverse_variant_id = p_variant_id
      and (source_updated_at is null or p_source_updated_at > source_updated_at);
  return found;
end;
$$;
revoke all on function public.apply_loyverse_inventory_level(text, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_loyverse_inventory_level(text, numeric, timestamptz) to service_role;

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
  delete from public.api_rate_limits where window_started_at < now() - interval '7 days';
  delete from public.newsletter_subscribers
    where status = 'pending' and confirmation_expires_at < now() - interval '7 days';
  return v_count;
end;
$$;
revoke all on function public.expire_checkout_inventory() from public, anon, authenticated;
grant execute on function public.expire_checkout_inventory() to service_role;

create or replace view public.catalog_products_available
with (security_invoker = true)
as
select
  p.*,
  greatest(0, p.stock - coalesce(r.reserved_quantity, 0)) as available_stock
from public.products p
left join (
  select product_id, sum(quantity) as reserved_quantity
  from public.checkout_reservations
  where status = 'active' and expires_at > now()
  group by product_id
) r on r.product_id = p.id
where p.active = true and p.stock > coalesce(r.reserved_quantity, 0);

revoke all on public.catalog_products_available from public, anon, authenticated;
grant select on public.catalog_products_available to service_role;
