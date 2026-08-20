alter table public.products
  add column if not exists loyverse_tax_ids text[] not null default '{}';
