create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  loyverse_item_id text,
  loyverse_variant_id text unique,
  slug text not null unique,
  brand text,
  name text not null,
  concentration text,
  size text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  description text,
  scent_family text check (scent_family in ('Floral', 'Fresh', 'Woody', 'Amber', 'Gourmand')),
  notes jsonb not null default '{"top":[],"heart":[],"base":[]}'::jsonb,
  image_url text,
  image_alt text,
  featured boolean not null default false,
  new_arrival boolean not null default false,
  stock numeric(12,3) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 100,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_sort_idx on public.products (active, sort_order);
create index if not exists products_loyverse_item_idx on public.products (loyverse_item_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  loyverse_receipt_id text,
  customer_email text not null,
  customer_name text,
  customer_phone text,
  currency text not null,
  subtotal numeric(12,2) not null,
  total numeric(12,2) not null,
  status text not null check (status in ('pending', 'paid', 'refunded', 'cancelled')),
  fulfillment_status text not null check (fulfillment_status in ('unfulfilled', 'ready', 'fulfilled', 'cancelled')),
  delivery_details jsonb,
  line_items jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_email_idx on public.orders (customer_email);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'storefront',
  status text not null check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- The storefront uses the server-only service role. Do not expose direct table access.
revoke all on public.products from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.newsletter_subscribers from anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

drop trigger if exists newsletter_touch_updated_at on public.newsletter_subscribers;
create trigger newsletter_touch_updated_at before update on public.newsletter_subscribers
for each row execute function public.touch_updated_at();
