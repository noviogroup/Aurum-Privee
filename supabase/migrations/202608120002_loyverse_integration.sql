alter table public.products
  add column if not exists loyverse_category_id text,
  add column if not exists loyverse_category_name text,
  add column if not exists loyverse_sku text,
  add column if not exists loyverse_barcode text,
  add column if not exists loyverse_description text,
  add column if not exists loyverse_image_url text,
  add column if not exists loyverse_track_stock boolean not null default true,
  add column if not exists source_updated_at timestamptz;

create index if not exists products_loyverse_category_idx on public.products (loyverse_category_id);
create index if not exists products_loyverse_sku_idx on public.products (loyverse_sku);
create index if not exists products_loyverse_barcode_idx on public.products (loyverse_barcode);

alter table public.orders
  add column if not exists loyverse_customer_id text,
  add column if not exists shipping_amount numeric(12,2) not null default 0,
  add column if not exists loyverse_sync_status text not null default 'pending',
  add column if not exists loyverse_sync_error text,
  add column if not exists loyverse_synced_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_loyverse_sync_status_check') then
    alter table public.orders add constraint orders_loyverse_sync_status_check
      check (loyverse_sync_status in ('pending', 'processing', 'succeeded', 'failed', 'skipped'));
  end if;
end $$;

create index if not exists orders_loyverse_sync_status_idx on public.orders (loyverse_sync_status, created_at);

create table if not exists public.loyverse_webhook_events (
  event_hash text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'processed', 'failed')),
  payload_created_at timestamptz,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  operation text not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  metrics jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists integration_runs_provider_created_idx on public.integration_runs (provider, created_at desc);

alter table public.loyverse_webhook_events enable row level security;
alter table public.integration_runs enable row level security;
revoke all on public.loyverse_webhook_events from anon, authenticated;
revoke all on public.integration_runs from anon, authenticated;

drop trigger if exists loyverse_webhook_events_touch_updated_at on public.loyverse_webhook_events;
create trigger loyverse_webhook_events_touch_updated_at before update on public.loyverse_webhook_events
for each row execute function public.touch_updated_at();
