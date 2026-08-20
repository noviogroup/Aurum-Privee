alter table public.orders
  add column if not exists fulfillment_email_status text not null default 'not_sent',
  add column if not exists fulfillment_email_error text,
  add column if not exists fulfillment_email_sent_at timestamptz,
  add column if not exists fulfillment_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_fulfillment_email_status_check') then
    alter table public.orders add constraint orders_fulfillment_email_status_check
      check (fulfillment_email_status in ('not_sent', 'pending', 'sent', 'failed'));
  end if;
end $$;

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
    fulfillment_email_error = null
    where o.id = p_order_id;
  return query select o.id, o.order_number, o.customer_name, o.customer_email, o.shipping_amount,
    o.delivery_details, o.fulfillment_status, true from public.orders o where o.id = p_order_id;
end;
$$;

revoke all on function public.transition_order_fulfillment(uuid, text) from public, anon, authenticated;
grant execute on function public.transition_order_fulfillment(uuid, text) to service_role;
