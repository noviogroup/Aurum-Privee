-- Private client-care inquiries with server-only creation and notification state.

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null check (length(customer_name) between 2 and 100),
  customer_email text not null check (customer_email = lower(btrim(customer_email)) and length(customer_email) <= 254),
  customer_phone text check (customer_phone is null or length(customer_phone) <= 40),
  topic text not null check (topic in ('Fragrance guidance', 'Order help', 'Gifting', 'Authenticity', 'Other')),
  order_number text check (order_number is null or length(order_number) <= 64),
  message text not null check (length(message) between 20 and 2000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'replied', 'closed')),
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  notification_error text check (notification_error is null or length(notification_error) <= 500),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_inquiries_queue_idx on public.contact_inquiries (status, created_at desc);
create index if not exists contact_inquiries_email_idx on public.contact_inquiries (customer_email, created_at desc);

alter table public.contact_inquiries enable row level security;
revoke all on public.contact_inquiries from public, anon, authenticated;

create table if not exists public.contact_inquiry_replies (
  id uuid primary key,
  inquiry_id uuid not null references public.contact_inquiries(id) on delete cascade,
  message text not null check (length(message) between 10 and 4000),
  provider_message_id text,
  sent_at timestamptz not null default now()
);
create index if not exists contact_inquiry_replies_inquiry_idx on public.contact_inquiry_replies (inquiry_id, sent_at desc);
alter table public.contact_inquiry_replies enable row level security;
revoke all on public.contact_inquiry_replies from public, anon, authenticated;

drop trigger if exists contact_inquiries_touch_updated_at on public.contact_inquiries;
create trigger contact_inquiries_touch_updated_at before update on public.contact_inquiries
for each row execute function public.touch_updated_at();

create or replace function public.create_contact_inquiry(
  p_name text,
  p_email text,
  p_phone text,
  p_topic text,
  p_order_number text,
  p_message text
)
returns table (inquiry_id uuid, inquiry_reference text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(btrim(p_email));
  v_reference text;
begin
  if p_name is null or length(btrim(p_name)) not between 2 and 100 then raise exception 'Invalid inquiry name'; end if;
  if v_email is null or length(v_email) > 254 or position('@' in v_email) < 2 then raise exception 'Invalid inquiry email'; end if;
  if p_phone is not null and length(btrim(p_phone)) > 40 then raise exception 'Invalid inquiry phone'; end if;
  if p_topic is null or p_topic not in ('Fragrance guidance', 'Order help', 'Gifting', 'Authenticity', 'Other') then raise exception 'Invalid inquiry topic'; end if;
  if p_order_number is not null and length(btrim(p_order_number)) > 64 then raise exception 'Invalid inquiry order'; end if;
  if p_message is null or length(btrim(p_message)) not between 20 and 2000 then raise exception 'Invalid inquiry message'; end if;

  v_reference := 'LLC-' || upper(substring(replace(v_id::text, '-', '') from 1 for 10));
  insert into public.contact_inquiries (
    id, reference, customer_name, customer_email, customer_phone, topic, order_number, message
  ) values (
    v_id, v_reference, btrim(p_name), v_email, nullif(btrim(p_phone), ''), p_topic,
    nullif(btrim(p_order_number), ''), btrim(p_message)
  );
  inquiry_id := v_id;
  inquiry_reference := v_reference;
  return next;
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
  update public.contact_inquiries
    set notification_status = p_status,
        notification_error = case when p_status = 'failed' then left(coalesce(p_error, 'Delivery failed'), 500) else null end,
        notified_at = case when p_status = 'sent' then now() else null end
    where id = p_inquiry_id and notification_status <> 'sent';
  return found;
end;
$$;

create or replace function public.transition_contact_inquiry(
  p_inquiry_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('new', 'in_progress', 'closed') then raise exception 'Invalid inquiry status'; end if;
  update public.contact_inquiries set status = p_status where id = p_inquiry_id;
  return found;
end;
$$;

create or replace function public.record_contact_inquiry_reply(
  p_reply_id uuid,
  p_inquiry_id uuid,
  p_message text,
  p_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_reply_id is null or p_inquiry_id is null then raise exception 'Reply identifiers are required'; end if;
  if p_message is null or length(btrim(p_message)) not between 10 and 4000 then raise exception 'Invalid reply message'; end if;
  perform pg_advisory_xact_lock(hashtextextended('inquiry:' || p_inquiry_id::text, 0));
  if not exists (select 1 from public.contact_inquiries where id = p_inquiry_id) then raise exception 'Inquiry not found'; end if;
  insert into public.contact_inquiry_replies (id, inquiry_id, message, provider_message_id)
    values (p_reply_id, p_inquiry_id, btrim(p_message), nullif(btrim(p_provider_message_id), ''))
    on conflict (id) do nothing;
  update public.contact_inquiries set status = 'replied' where id = p_inquiry_id;
  return found;
end;
$$;

revoke all on function public.create_contact_inquiry(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.set_contact_inquiry_notification(uuid,text,text) from public, anon, authenticated;
revoke all on function public.transition_contact_inquiry(uuid,text) from public, anon, authenticated;
revoke all on function public.record_contact_inquiry_reply(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_contact_inquiry(text,text,text,text,text,text) to service_role;
grant execute on function public.set_contact_inquiry_notification(uuid,text,text) to service_role;
grant execute on function public.transition_contact_inquiry(uuid,text) to service_role;
grant execute on function public.record_contact_inquiry_reply(uuid,uuid,text,text) to service_role;
