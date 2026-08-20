-- Recover interrupted Loyverse sale/refund workers without permitting unbounded retries.

alter table public.orders
  add column if not exists loyverse_sync_attempts integer not null default 0,
  add column if not exists loyverse_sync_claimed_at timestamptz,
  add column if not exists loyverse_refund_sync_attempts integer not null default 0,
  add column if not exists loyverse_refund_sync_claimed_at timestamptz;

alter table public.orders drop constraint if exists orders_loyverse_sync_attempts_check;
alter table public.orders add constraint orders_loyverse_sync_attempts_check
  check (loyverse_sync_attempts between 0 and 100);
alter table public.orders drop constraint if exists orders_loyverse_refund_sync_attempts_check;
alter table public.orders add constraint orders_loyverse_refund_sync_attempts_check
  check (loyverse_refund_sync_attempts between 0 and 100);

create index if not exists orders_loyverse_sale_retry_idx
  on public.orders (loyverse_sync_status, loyverse_sync_attempts, loyverse_sync_claimed_at, created_at)
  where loyverse_sync_status in ('pending', 'processing', 'failed');
create index if not exists orders_loyverse_refund_retry_idx
  on public.orders (loyverse_refund_sync_status, loyverse_refund_sync_attempts, loyverse_refund_sync_claimed_at, created_at)
  where loyverse_refund_sync_status in ('pending', 'processing', 'failed');

create or replace function public.claim_order_sync(p_order_id uuid, p_operation text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_operation = 'sale' then
    update public.orders set
      loyverse_sync_status = 'processing',
      loyverse_sync_attempts = loyverse_sync_attempts + 1,
      loyverse_sync_claimed_at = now(),
      loyverse_sync_error = null
    where id = p_order_id
      and loyverse_sync_attempts < 8
      and (
        loyverse_sync_status in ('pending', 'failed')
        or (loyverse_sync_status = 'processing' and (loyverse_sync_claimed_at is null or loyverse_sync_claimed_at < now() - interval '15 minutes'))
      );
  elsif p_operation = 'refund' then
    update public.orders set
      loyverse_refund_sync_status = 'processing',
      loyverse_refund_sync_attempts = loyverse_refund_sync_attempts + 1,
      loyverse_refund_sync_claimed_at = now(),
      loyverse_refund_sync_error = null
    where id = p_order_id
      and loyverse_refund_sync_attempts < 8
      and (
        loyverse_refund_sync_status in ('pending', 'failed')
        or (loyverse_refund_sync_status = 'processing' and (loyverse_refund_sync_claimed_at is null or loyverse_refund_sync_claimed_at < now() - interval '15 minutes'))
      );
  else
    raise exception 'Invalid synchronization operation';
  end if;
  return found;
end;
$$;

revoke all on function public.claim_order_sync(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_order_sync(uuid,text) to service_role;
