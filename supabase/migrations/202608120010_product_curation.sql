alter table public.products
  add column if not exists storefront_visible boolean not null default true,
  add column if not exists curated_at timestamptz;

create index if not exists products_curation_queue_idx
  on public.products (curated_at nulls first, sort_order, name)
  where active = true;

create table if not exists public.product_curation_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists product_curation_events_product_created_idx
  on public.product_curation_events (product_id, created_at desc);
alter table public.product_curation_events enable row level security;
revoke all on public.product_curation_events from public, anon, authenticated;

create or replace function public.publish_product_curation(
  p_product_id uuid,
  p_description text,
  p_scent_family text,
  p_notes jsonb,
  p_featured boolean,
  p_new_arrival boolean,
  p_storefront_visible boolean,
  p_sort_order integer
)
returns table (product_id uuid, curated_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products%rowtype;
  v_now timestamptz := now();
  v_before jsonb;
  v_after jsonb;
begin
  if p_product_id is null then raise exception 'Product is required'; end if;
  if p_description is null or length(trim(p_description)) not between 20 and 1200 then raise exception 'Description must contain 20 to 1200 characters'; end if;
  if p_scent_family not in ('Floral', 'Fresh', 'Woody', 'Amber', 'Gourmand') then raise exception 'Scent family is invalid'; end if;
  if p_notes is null or jsonb_typeof(p_notes) <> 'object'
    or jsonb_typeof(p_notes->'top') <> 'array'
    or jsonb_typeof(p_notes->'heart') <> 'array'
    or jsonb_typeof(p_notes->'base') <> 'array'
    or jsonb_array_length(p_notes->'top') > 12
    or jsonb_array_length(p_notes->'heart') > 12
    or jsonb_array_length(p_notes->'base') > 12
    or exists (
      select 1 from jsonb_array_elements((p_notes->'top') || (p_notes->'heart') || (p_notes->'base')) note
      where jsonb_typeof(note) <> 'string' or length(trim(note #>> '{}')) not between 1 and 60
    )
  then raise exception 'Scent notes are invalid'; end if;
  if p_featured is null or p_new_arrival is null or p_storefront_visible is null then raise exception 'Merchandising flags are required'; end if;
  if p_sort_order not between 0 and 100000 then raise exception 'Sort order is invalid'; end if;

  perform pg_advisory_xact_lock(hashtextextended('product-curation:' || p_product_id::text, 0));
  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product does not exist'; end if;

  v_before := jsonb_build_object(
    'description', v_product.description, 'scent_family', v_product.scent_family, 'notes', v_product.notes,
    'featured', v_product.featured, 'new_arrival', v_product.new_arrival,
    'storefront_visible', v_product.storefront_visible, 'sort_order', v_product.sort_order
  );
  v_after := jsonb_build_object(
    'description', trim(p_description), 'scent_family', p_scent_family, 'notes', p_notes,
    'featured', p_featured, 'new_arrival', p_new_arrival,
    'storefront_visible', p_storefront_visible, 'sort_order', p_sort_order
  );

  update public.products set
    description = trim(p_description), scent_family = p_scent_family, notes = p_notes,
    featured = p_featured, new_arrival = p_new_arrival,
    storefront_visible = p_storefront_visible, sort_order = p_sort_order,
    curated_at = v_now, updated_at = v_now
  where id = p_product_id;

  insert into public.product_curation_events (product_id, before_state, after_state, created_at)
  values (p_product_id, v_before, v_after, v_now);

  product_id := p_product_id;
  curated_at := v_now;
  return next;
end;
$$;

revoke all on function public.publish_product_curation(uuid, text, text, jsonb, boolean, boolean, boolean, integer) from public, anon, authenticated;
grant execute on function public.publish_product_curation(uuid, text, text, jsonb, boolean, boolean, boolean, integer) to service_role;

drop view if exists public.catalog_products_available;
create view public.catalog_products_available
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
where p.active = true
  and p.storefront_visible = true
  and p.stock > coalesce(r.reserved_quantity, 0);

revoke all on public.catalog_products_available from public, anon, authenticated;
grant select on public.catalog_products_available to service_role;
