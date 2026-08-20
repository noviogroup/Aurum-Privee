-- Durable, idempotent retry state for order and client-care transactional email.

alter table public.orders
  add column if not exists confirmation_email_status text not null default 'not_sent',
  add column if not exists confirmation_email_attempts integer not null default 0,
  add column if not exists confirmation_email_error text,
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_updated_at timestamptz,
  add column if not exists fulfillment_email_attempts integer not null default 0,
  add column if not exists fulfillment_email_updated_at timestamptz;

alter table public.orders drop constraint if exists orders_confirmation_email_status_check;
alter table public.orders add constraint orders_confirmation_email_status_check
  check (confirmation_email_status in ('not_sent', 'pending', 'processing', 'sent', 'failed'));
alter table public.orders drop constraint if exists orders_fulfillment_email_status_check;
alter table public.orders add constraint orders_fulfillment_email_status_check
  check (fulfillment_email_status in ('not_sent', 'pending', 'processing', 'sent', 'failed'));
alter table public.orders add constraint orders_confirmation_email_attempts_check
  check (confirmation_email_attempts between 0 and 100);
alter table public.orders add constraint orders_fulfillment_email_attempts_check
  check (fulfillment_email_attempts between 0 and 100);

create index if not exists orders_confirmation_email_retry_idx
  on public.orders (confirmation_email_status, confirmation_email_attempts, created_at)
  where confirmation_email_status in ('pending', 'failed');
create index if not exists orders_fulfillment_email_retry_idx
  on public.orders (fulfillment_email_status, fulfillment_email_attempts, updated_at)
  where fulfillment_email_status in ('pending', 'failed');

alter table public.contact_inquiries
  add column if not exists notification_attempts integer not null default 0,
  add column if not exists notification_updated_at timestamptz;
alter table public.contact_inquiries drop constraint if exists contact_inquiries_notification_status_check;
alter table public.contact_inquiries add constraint contact_inquiries_notification_status_check
  check (notification_status in ('pending', 'processing', 'sent', 'failed'));
alter table public.contact_inquiries add constraint contact_inquiries_notification_attempts_check
  check (notification_attempts between 0 and 100);
create index if not exists contact_inquiries_notification_retry_idx
  on public.contact_inquiries (notification_status, notification_attempts, created_at)
  where notification_status in ('pending', 'failed');

create or replace function public.claim_order_email(p_order_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_kind = 'confirmation' then
    update public.orders set
      confirmation_email_status = 'processing',
      confirmation_email_attempts = confirmation_email_attempts + 1,
      confirmation_email_error = null,
      confirmation_email_updated_at = now()
    where id = p_order_id
      and customer_email <> ''
      and confirmation_email_attempts < 8
      and (
        confirmation_email_status in ('pending', 'failed')
        or (confirmation_email_status = 'processing' and confirmation_email_updated_at < now() - interval '15 minutes')
      );
  elsif p_kind = 'fulfillment' then
    update public.orders set
      fulfillment_email_status = 'processing',
      fulfillment_email_attempts = fulfillment_email_attempts + 1,
      fulfillment_email_error = null,
      fulfillment_email_updated_at = now()
    where id = p_order_id
      and customer_email <> ''
      and fulfillment_status in ('ready', 'fulfilled', 'cancelled')
      and fulfillment_email_attempts < 8
      and (
        fulfillment_email_status in ('pending', 'failed')
        or (fulfillment_email_status = 'processing' and fulfillment_email_updated_at < now() - interval '15 minutes')
      );
  else
    raise exception 'Invalid order email kind';
  end if;
  return found;
end;
$$;

create or replace function public.complete_order_email(
  p_order_id uuid,
  p_kind text,
  p_status text,
  p_error text default null,
  p_fulfillment_status text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('sent', 'failed') then raise exception 'Invalid order email result'; end if;
  if p_kind = 'confirmation' then
    update public.orders set
      confirmation_email_status = p_status,
      confirmation_email_error = case when p_status = 'failed' then left(coalesce(p_error, 'Delivery failed'), 500) else null end,
      confirmation_email_sent_at = case when p_status = 'sent' then now() else confirmation_email_sent_at end,
      confirmation_email_updated_at = now()
    where id = p_order_id and confirmation_email_status = 'processing';
  elsif p_kind = 'fulfillment' then
    if p_fulfillment_status not in ('ready', 'fulfilled', 'cancelled') then raise exception 'Fulfillment status is required'; end if;
    update public.orders set
      fulfillment_email_status = p_status,
      fulfillment_email_error = case when p_status = 'failed' then left(coalesce(p_error, 'Delivery failed'), 500) else null end,
      fulfillment_email_sent_at = case when p_status = 'sent' then now() else fulfillment_email_sent_at end,
      fulfillment_email_updated_at = now()
    where id = p_order_id and fulfillment_email_status = 'processing' and fulfillment_status = p_fulfillment_status;
  else
    raise exception 'Invalid order email kind';
  end if;
  return found;
end;
$$;

create or replace function public.claim_contact_inquiry_notification(p_inquiry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.contact_inquiries set
    notification_status = 'processing',
    notification_attempts = notification_attempts + 1,
    notification_error = null,
    notification_updated_at = now()
  where id = p_inquiry_id
    and notification_attempts < 8
    and (
      notification_status in ('pending', 'failed')
      or (notification_status = 'processing' and notification_updated_at < now() - interval '15 minutes')
    );
  return found;
end;
$$;

create or replace function public.set_contact_inquiry_notification(
  p_inquiry_id uuid,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('sent', 'failed') then raise exception 'Invalid notification status'; end if;
  update public.contact_inquiries set
    notification_status = p_status,
    notification_error = case when p_status = 'failed' then left(coalesce(p_error, 'Delivery failed'), 500) else null end,
    notified_at = case when p_status = 'sent' then now() else notified_at end,
    notification_updated_at = now()
  where id = p_inquiry_id and notification_status = 'processing';
  return found;
end;
$$;

create or replace function public.transition_order_fulfillment(
  p_order_id uuid,
  p_next_status text
)
returns table (
  id uuid,
  order_number text,
  customer_name text,
  customer_email text,
  shipping_amount numeric,
  delivery_details jsonb,
  fulfillment_status text,
  email_required boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_current text;
declare v_email_status text;
begin
  if p_next_status not in ('ready', 'fulfilled', 'cancelled') then raise exception 'Invalid fulfillment status'; end if;
  select o.fulfillment_status, o.fulfillment_email_status into v_current, v_email_status from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'Order does not exist'; end if;
  if v_current = 'cancelled' then raise exception 'Cancelled fulfillment is terminal'; end if;
  if v_current = 'fulfilled' and p_next_status <> 'fulfilled' then raise exception 'Fulfilled orders cannot move backwards'; end if;
  if v_current = p_next_status then
    return query select o.id, o.order_number, o.customer_name, o.customer_email, o.shipping_amount,
      o.delivery_details, o.fulfillment_status, v_email_status in ('pending', 'failed') from public.orders o where o.id = p_order_id;
    return;
  end if;
  update public.orders o set
    fulfillment_status = p_next_status,
    fulfillment_updated_at = now(),
    fulfillment_email_status = 'pending',
    fulfillment_email_attempts = 0,
    fulfillment_email_error = null,
    fulfillment_email_updated_at = now()
    where o.id = p_order_id;
  return query select o.id, o.order_number, o.customer_name, o.customer_email, o.shipping_amount,
    o.delivery_details, o.fulfillment_status, true from public.orders o where o.id = p_order_id;
end;
$$;

revoke all on function public.claim_order_email(uuid,text) from public, anon, authenticated;
revoke all on function public.complete_order_email(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.claim_contact_inquiry_notification(uuid) from public, anon, authenticated;
revoke all on function public.set_contact_inquiry_notification(uuid,text,text) from public, anon, authenticated;
revoke all on function public.transition_order_fulfillment(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_order_email(uuid,text) to service_role;
grant execute on function public.complete_order_email(uuid,text,text,text,text) to service_role;
grant execute on function public.claim_contact_inquiry_notification(uuid) to service_role;
grant execute on function public.set_contact_inquiry_notification(uuid,text,text) to service_role;
grant execute on function public.transition_order_fulfillment(uuid,text) to service_role;
