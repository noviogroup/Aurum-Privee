create table if not exists public.product_image_uploads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  image_url text not null,
  storage_path text not null unique,
  source_filename text not null,
  source_sha256 text not null,
  source_width integer not null check (source_width between 800 and 20000),
  source_height integer not null check (source_height between 800 and 20000),
  status text not null default 'published' check (status in ('published', 'replaced')),
  created_at timestamptz not null default now()
);

create unique index if not exists product_image_uploads_current_idx
  on public.product_image_uploads (product_id)
  where status = 'published';
create index if not exists product_image_uploads_created_idx
  on public.product_image_uploads (created_at desc);

alter table public.product_image_uploads enable row level security;
revoke all on public.product_image_uploads from public, anon, authenticated;

create or replace function public.publish_product_image(
  p_product_id uuid,
  p_image_url text,
  p_storage_path text,
  p_source_filename text,
  p_source_sha256 text,
  p_source_width integer,
  p_source_height integer
)
returns table (product_id uuid, image_url text, published_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_now timestamptz := now();
begin
  if p_product_id is null then raise exception 'Product is required'; end if;
  if p_image_url is null or length(p_image_url) not between 8 and 2048 then raise exception 'Image URL is invalid'; end if;
  if p_storage_path is null or length(p_storage_path) not between 8 and 512 then raise exception 'Storage path is invalid'; end if;
  if p_source_filename is null or length(p_source_filename) not between 1 and 255 then raise exception 'Source filename is invalid'; end if;
  if p_source_sha256 is null or length(p_source_sha256) <> 64 then raise exception 'Source hash is invalid'; end if;
  if p_source_width not between 800 and 20000 or p_source_height not between 800 and 20000 then raise exception 'Image dimensions are invalid'; end if;

  perform pg_advisory_xact_lock(hashtextextended('product-image:' || p_product_id::text, 0));
  select p.name into v_name from public.products p where p.id = p_product_id and p.active = true for update;
  if not found then raise exception 'Active product does not exist'; end if;

  update public.product_image_uploads
    set status = 'replaced'
    where product_image_uploads.product_id = p_product_id and status = 'published';

  insert into public.product_image_uploads (
    product_id, image_url, storage_path, source_filename, source_sha256,
    source_width, source_height, status, created_at
  ) values (
    p_product_id, p_image_url, p_storage_path, p_source_filename, p_source_sha256,
    p_source_width, p_source_height, 'published', v_now
  );

  update public.products
    set image_url = p_image_url,
        image_alt = v_name || ' product photograph',
        updated_at = v_now
    where id = p_product_id;

  product_id := p_product_id;
  image_url := p_image_url;
  published_at := v_now;
  return next;
end;
$$;

revoke all on function public.publish_product_image(uuid, text, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.publish_product_image(uuid, text, text, text, text, integer, integer) to service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    execute $storage$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('product-images', 'product-images', true, 10000000, array['image/webp'])
      on conflict (id) do update set
        public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types
    $storage$;
  end if;
end $$;
