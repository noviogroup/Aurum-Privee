alter table public.orders
  add column if not exists refunded_amount numeric(12,2) not null default 0,
  add column if not exists loyverse_refund_receipt_id text,
  add column if not exists loyverse_refund_sync_status text not null default 'not_required',
  add column if not exists loyverse_refund_sync_error text,
  add column if not exists loyverse_refund_synced_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'partially_refunded', 'refunded', 'cancelled'));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_loyverse_refund_sync_status_check') then
    alter table public.orders add constraint orders_loyverse_refund_sync_status_check
      check (loyverse_refund_sync_status in ('not_required', 'pending', 'processing', 'succeeded', 'failed', 'manual_required'));
  end if;
end $$;

create index if not exists orders_loyverse_refund_sync_status_idx
  on public.orders (loyverse_refund_sync_status, created_at);
