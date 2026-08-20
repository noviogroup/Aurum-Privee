alter table public.products
  add column if not exists loyverse_taxes jsonb not null default '[]'::jsonb;

alter table public.orders
  add column if not exists tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0);
