#!/usr/bin/env bash
set -euo pipefail

POSTGRES_BIN="${POSTGRES_BIN:-/usr/local/opt/postgresql@16/bin}"
PSQL="$POSTGRES_BIN/psql"
INITDB="$POSTGRES_BIN/initdb"
PG_CTL="$POSTGRES_BIN/pg_ctl"

for executable in "$PSQL" "$INITDB" "$PG_CTL"; do
  if [[ ! -x "$executable" ]]; then
    echo "PostgreSQL 16 tools were not found at $POSTGRES_BIN" >&2
    exit 1
  fi
done

database_directory="$(mktemp -d /tmp/aurum-privee-pg-XXXXXX)"
socket_directory="$(mktemp -d /tmp/aurum-privee-pg-socket-XXXXXX)"
port="${AURUM_TEST_POSTGRES_PORT:-55432}"

cleanup() {
  "$PG_CTL" -D "$database_directory" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$database_directory" "$socket_directory"
}
trap cleanup EXIT

"$INITDB" -D "$database_directory" --no-locale --encoding=UTF8 --auth=trust >/dev/null
"$PG_CTL" -D "$database_directory" -o "-k $socket_directory -p $port" -l "$database_directory/postgres.log" start >/dev/null

"$PSQL" -v ON_ERROR_STOP=1 -q -h "$socket_directory" -p "$port" -U "$USER" -d postgres <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
SQL

for migration in supabase/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  "$PSQL" -v ON_ERROR_STOP=1 -q -h "$socket_directory" -p "$port" -U "$USER" -d postgres -f "$migration"
done

"$PSQL" -v ON_ERROR_STOP=1 -q -h "$socket_directory" -p "$port" -U "$USER" -d postgres <<'SQL'
do $$
begin
  if to_regclass('public.catalog_products_available') is null then raise exception 'Catalog availability view is missing'; end if;
  if to_regprocedure('public.consume_rate_limit(text,text,integer,integer)') is null then raise exception 'Rate limiter is missing'; end if;
  if to_regprocedure('public.reserve_checkout_inventory(uuid,jsonb,timestamp with time zone,text)') is null then raise exception 'Secure reservation function is missing'; end if;
  if to_regprocedure('public.convert_checkout_inventory(uuid,text,jsonb)') is null then raise exception 'Secure conversion function is missing'; end if;
  if to_regprocedure('public.claim_order_sync(uuid,text)') is null then raise exception 'Order sync claim is missing'; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'loyverse_sync_claimed_at'
  ) then raise exception 'Loyverse stale-claim recovery columns are missing'; end if;
  if to_regprocedure('public.request_newsletter_confirmation(text,text,text,timestamp with time zone)') is null then raise exception 'Newsletter confirmation request function is missing'; end if;
  if to_regprocedure('public.transition_order_fulfillment(uuid,text)') is null then raise exception 'Order fulfillment transition function is missing'; end if;
  if to_regprocedure('public.publish_product_image(uuid,text,text,text,text,integer,integer)') is null then raise exception 'Product image publishing function is missing'; end if;
  if to_regprocedure('public.publish_product_curation(uuid,text,text,jsonb,boolean,boolean,boolean,integer)') is null then raise exception 'Product curation publishing function is missing'; end if;
  if to_regprocedure('public.publish_customer_profile(text,text[],text,boolean)') is null then raise exception 'Customer profile publishing function is missing'; end if;
  if to_regprocedure('public.create_contact_inquiry(text,text,text,text,text,text)') is null then raise exception 'Contact inquiry creation function is missing'; end if;
  if to_regprocedure('public.transition_contact_inquiry(uuid,text)') is null then raise exception 'Contact inquiry transition function is missing'; end if;
  if to_regprocedure('public.record_contact_inquiry_reply(uuid,uuid,text,text)') is null then raise exception 'Contact reply recording function is missing'; end if;
  if to_regprocedure('public.claim_order_email(uuid,text)') is null then raise exception 'Order email claim is missing'; end if;
  if to_regprocedure('public.complete_order_email(uuid,text,text,text,text)') is null then raise exception 'Order email completion is missing'; end if;
  if to_regprocedure('public.claim_contact_inquiry_notification(uuid)') is null then raise exception 'Contact notification claim is missing'; end if;
end $$;

insert into public.products (id, loyverse_variant_id, slug, name, price, stock)
values ('10000000-0000-0000-0000-000000000001', 'variant-test', 'test-scent', 'Test Scent', 100, 2);

select * from public.reserve_checkout_inventory(
  '20000000-0000-0000-0000-000000000001',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","quantity":1}]',
  now() + interval '30 minutes',
  repeat('a', 64)
);

update public.checkout_reservations set stripe_session_id = 'cs_test_migration' where checkout_reference = '20000000-0000-0000-0000-000000000001';

select * from public.convert_checkout_inventory(
  '20000000-0000-0000-0000-000000000001',
  'cs_test_migration',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","quantity":1}]'
);

do $$
declare v_stock numeric; v_status text;
begin
  select stock into v_stock from public.products where id = '10000000-0000-0000-0000-000000000001';
  select status into v_status from public.checkout_reservations where checkout_reference = '20000000-0000-0000-0000-000000000001';
  if v_stock <> 1 or v_status <> 'converted' then raise exception 'Reservation conversion invariant failed'; end if;
end $$;

insert into public.orders (
  id, order_number, stripe_session_id, customer_email, customer_name, currency,
  subtotal, total, status, fulfillment_status, line_items
) values (
  '30000000-0000-0000-0000-000000000001', 'AP-MIGRATION', 'cs_test_fulfillment',
  'client@example.com', 'Client', 'BSD', 100, 100, 'paid', 'unfulfilled', '[]'
);

do $$
declare v_claimed boolean; v_status text; v_attempts integer;
begin
  select public.claim_order_sync('30000000-0000-0000-0000-000000000001', 'sale') into v_claimed;
  if not v_claimed then raise exception 'Loyverse sale was not claimed'; end if;
  select loyverse_sync_status, loyverse_sync_attempts into v_status, v_attempts
    from public.orders where id = '30000000-0000-0000-0000-000000000001';
  if v_status <> 'processing' or v_attempts <> 1 then raise exception 'Loyverse sale claim state is invalid'; end if;
  select public.claim_order_sync('30000000-0000-0000-0000-000000000001', 'sale') into v_claimed;
  if v_claimed then raise exception 'Fresh Loyverse sale claim was acquired twice'; end if;
  update public.orders set loyverse_sync_claimed_at = now() - interval '16 minutes'
    where id = '30000000-0000-0000-0000-000000000001';
  select public.claim_order_sync('30000000-0000-0000-0000-000000000001', 'sale') into v_claimed;
  if not v_claimed then raise exception 'Stale Loyverse sale claim was not recovered'; end if;
  select loyverse_sync_attempts into v_attempts from public.orders where id = '30000000-0000-0000-0000-000000000001';
  if v_attempts <> 2 then raise exception 'Recovered Loyverse sale did not increment attempts'; end if;
  update public.orders set loyverse_sync_status = 'succeeded', loyverse_sync_claimed_at = null,
    loyverse_refund_sync_status = 'pending' where id = '30000000-0000-0000-0000-000000000001';

  select public.claim_order_sync('30000000-0000-0000-0000-000000000001', 'refund') into v_claimed;
  if not v_claimed then raise exception 'Loyverse refund was not claimed'; end if;
  select public.claim_order_sync('30000000-0000-0000-0000-000000000001', 'refund') into v_claimed;
  if v_claimed then raise exception 'Fresh Loyverse refund claim was acquired twice'; end if;
  update public.orders set loyverse_refund_sync_claimed_at = now() - interval '16 minutes'
    where id = '30000000-0000-0000-0000-000000000001';
  select public.claim_order_sync('30000000-0000-0000-0000-000000000001', 'refund') into v_claimed;
  if not v_claimed then raise exception 'Stale Loyverse refund claim was not recovered'; end if;
  select loyverse_refund_sync_attempts into v_attempts from public.orders where id = '30000000-0000-0000-0000-000000000001';
  if v_attempts <> 2 then raise exception 'Recovered Loyverse refund did not increment attempts'; end if;
  update public.orders set loyverse_refund_sync_status = 'succeeded', loyverse_refund_sync_claimed_at = null
    where id = '30000000-0000-0000-0000-000000000001';

  update public.orders set loyverse_sync_status = 'failed', loyverse_sync_attempts = 8
    where id = '30000000-0000-0000-0000-000000000001';
  select public.claim_order_sync('30000000-0000-0000-0000-000000000001', 'sale') into v_claimed;
  if v_claimed then raise exception 'Exhausted Loyverse sale was claimed a ninth time'; end if;
  update public.orders set loyverse_sync_status = 'succeeded'
    where id = '30000000-0000-0000-0000-000000000001';
end $$;

update public.orders set confirmation_email_status = 'pending' where id = '30000000-0000-0000-0000-000000000001';
do $$
declare v_claimed boolean; v_status text; v_attempts integer;
begin
  select public.claim_order_email('30000000-0000-0000-0000-000000000001', 'confirmation') into v_claimed;
  if not v_claimed then raise exception 'Confirmation email was not claimed'; end if;
  perform public.complete_order_email('30000000-0000-0000-0000-000000000001', 'confirmation', 'sent', null, null);
  select confirmation_email_status, confirmation_email_attempts into v_status, v_attempts from public.orders where id = '30000000-0000-0000-0000-000000000001';
  if v_status <> 'sent' or v_attempts <> 1 then raise exception 'Confirmation email completion invariant failed'; end if;
  select public.claim_order_email('30000000-0000-0000-0000-000000000001', 'confirmation') into v_claimed;
  if v_claimed then raise exception 'Sent confirmation email was claimed twice'; end if;
end $$;

select * from public.transition_order_fulfillment('30000000-0000-0000-0000-000000000001', 'ready');

do $$
declare v_status text; v_email_status text; v_duplicate boolean;
begin
  select fulfillment_status, fulfillment_email_status into v_status, v_email_status
    from public.orders where id = '30000000-0000-0000-0000-000000000001';
  if v_status <> 'ready' or v_email_status <> 'pending' then raise exception 'Fulfillment transition invariant failed'; end if;
  select email_required into v_duplicate from public.transition_order_fulfillment('30000000-0000-0000-0000-000000000001', 'ready');
  if not v_duplicate then raise exception 'Pending fulfillment email was not retryable'; end if;
  update public.orders set fulfillment_email_status = 'sent' where id = '30000000-0000-0000-0000-000000000001';
  select email_required into v_duplicate from public.transition_order_fulfillment('30000000-0000-0000-0000-000000000001', 'ready');
  if v_duplicate then raise exception 'Sent fulfillment email was requested again'; end if;
end $$;

select * from public.publish_product_image(
  '10000000-0000-0000-0000-000000000001',
  'https://example.supabase.co/storage/v1/object/public/product-images/products/test.webp',
  'products/10000000-0000-0000-0000-000000000001/test.webp',
  'test-product.jpg',
  repeat('b', 64),
  1200,
  1200
);

do $$
declare v_url text; v_status text;
begin
  select image_url into v_url from public.products where id = '10000000-0000-0000-0000-000000000001';
  select status into v_status from public.product_image_uploads where product_id = '10000000-0000-0000-0000-000000000001';
  if v_url not like '%/test.webp' or v_status <> 'published' then raise exception 'Product image publishing invariant failed'; end if;
end $$;

select * from public.publish_product_curation(
  '10000000-0000-0000-0000-000000000001',
  'A complete editorial description approved by Aurum Privée.',
  'Woody',
  '{"top":["Bergamot"],"heart":["Cedar"],"base":["Musk"]}',
  true, false, false, 42
);

do $$
declare v_price numeric; v_stock numeric; v_sku text; v_family text; v_visible boolean; v_events integer; v_available integer;
begin
  select price, stock, loyverse_sku, scent_family, storefront_visible into v_price, v_stock, v_sku, v_family, v_visible
    from public.products where id = '10000000-0000-0000-0000-000000000001';
  select count(*) into v_events from public.product_curation_events where product_id = '10000000-0000-0000-0000-000000000001';
  select count(*) into v_available from public.catalog_products_available where id = '10000000-0000-0000-0000-000000000001';
  if v_price <> 100 or v_stock <> 1 or v_sku is not null then raise exception 'Curation changed Loyverse-owned retail fields'; end if;
  if v_family <> 'Woody' or v_visible <> false or v_events <> 1 then raise exception 'Curation publishing invariant failed'; end if;
  if v_available <> 0 then raise exception 'Hidden curated product remained in storefront view'; end if;
end $$;

select * from public.publish_customer_profile(
  ' Client@Example.com ',
  array['Floral','Amber'],
  'Prefers gift-ready packaging.',
  true
);

do $$
declare v_email text; v_notes text; v_vip boolean; v_events integer;
begin
  select email_normalized, staff_notes, vip into v_email, v_notes, v_vip from public.customer_profiles where email_normalized = 'client@example.com';
  select count(*) into v_events from public.customer_profile_events where email_normalized = 'client@example.com';
  if v_email <> 'client@example.com' or v_notes <> 'Prefers gift-ready packaging.' or not v_vip or v_events <> 1 then raise exception 'Customer profile invariant failed'; end if;
end $$;

select * from public.create_contact_inquiry(
  ' Client Name ',
  ' Client@Example.com ',
  '+1 242 555 0100',
  'Fragrance guidance',
  null,
  'I would like help finding a polished floral fragrance for evenings.'
);

do $$
declare v_reference text; v_email text; v_status text; v_count integer;
begin
  select reference, customer_email, notification_status into v_reference, v_email, v_status
    from public.contact_inquiries where customer_email = 'client@example.com';
  select count(*) into v_count from public.contact_inquiries;
  if v_reference not like 'APC-%' or v_email <> 'client@example.com' or v_status <> 'pending' or v_count <> 1 then
    raise exception 'Contact inquiry invariant failed';
  end if;
  if not public.claim_contact_inquiry_notification((select id from public.contact_inquiries limit 1)) then raise exception 'Contact notification was not claimed'; end if;
  perform public.set_contact_inquiry_notification((select id from public.contact_inquiries limit 1), 'sent', null);
  select notification_status into v_status from public.contact_inquiries limit 1;
  if v_status <> 'sent' then raise exception 'Contact notification transition failed'; end if;
  perform public.transition_contact_inquiry((select id from public.contact_inquiries limit 1), 'in_progress');
  perform public.record_contact_inquiry_reply(
    '60000000-0000-0000-0000-000000000001',
    (select id from public.contact_inquiries limit 1),
    'We would be delighted to help you find the right floral fragrance.',
    'resend-test-message'
  );
  select status into v_status from public.contact_inquiries limit 1;
  if v_status <> 'replied' or (select count(*) from public.contact_inquiry_replies) <> 1 then raise exception 'Contact reply invariant failed'; end if;
end $$;
SQL

echo "All Supabase migrations and core commerce invariants passed on PostgreSQL 16."
