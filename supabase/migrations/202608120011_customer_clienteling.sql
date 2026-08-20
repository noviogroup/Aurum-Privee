create table if not exists public.customer_profiles (
  email_normalized text primary key,
  preferred_families text[] not null default '{}',
  staff_notes text not null default '',
  vip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email_normalized = lower(trim(email_normalized)) and length(email_normalized) between 3 and 320),
  check (length(staff_notes) <= 1000),
  check (preferred_families <@ array['Floral','Fresh','Woody','Amber','Gourmand']::text[]),
  check (cardinality(preferred_families) <= 5)
);

create table if not exists public.customer_profile_events (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null references public.customer_profiles(email_normalized) on delete restrict,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_profile_events_email_created_idx
  on public.customer_profile_events (email_normalized, created_at desc);
alter table public.customer_profiles enable row level security;
alter table public.customer_profile_events enable row level security;
revoke all on public.customer_profiles from public, anon, authenticated;
revoke all on public.customer_profile_events from public, anon, authenticated;

create or replace function public.publish_customer_profile(
  p_email text,
  p_preferred_families text[],
  p_staff_notes text,
  p_vip boolean
)
returns table (email_normalized text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_existing public.customer_profiles%rowtype;
  v_now timestamptz := now();
  v_before jsonb;
  v_after jsonb;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 320 then raise exception 'Customer email is invalid'; end if;
  if p_preferred_families is null or cardinality(p_preferred_families) > 5
    or not p_preferred_families <@ array['Floral','Fresh','Woody','Amber','Gourmand']::text[]
    or cardinality(p_preferred_families) <> cardinality(array(select distinct family from unnest(p_preferred_families) family))
  then raise exception 'Preferred fragrance families are invalid'; end if;
  if p_staff_notes is null or length(trim(p_staff_notes)) > 1000 then raise exception 'Staff notes are invalid'; end if;
  if p_vip is null then raise exception 'VIP status is required'; end if;

  perform pg_advisory_xact_lock(hashtextextended('customer-profile:' || v_email, 0));
  select * into v_existing from public.customer_profiles where customer_profiles.email_normalized = v_email for update;
  v_before := case when found then jsonb_build_object(
    'preferred_families', v_existing.preferred_families,
    'staff_notes', v_existing.staff_notes,
    'vip', v_existing.vip
  ) else '{}'::jsonb end;
  v_after := jsonb_build_object(
    'preferred_families', p_preferred_families,
    'staff_notes', trim(p_staff_notes),
    'vip', p_vip
  );

  insert into public.customer_profiles (email_normalized, preferred_families, staff_notes, vip, created_at, updated_at)
  values (v_email, p_preferred_families, trim(p_staff_notes), p_vip, v_now, v_now)
  on conflict on constraint customer_profiles_pkey do update set
    preferred_families = excluded.preferred_families,
    staff_notes = excluded.staff_notes,
    vip = excluded.vip,
    updated_at = excluded.updated_at;

  insert into public.customer_profile_events (email_normalized, before_state, after_state, created_at)
  values (v_email, v_before, v_after, v_now);

  email_normalized := v_email;
  updated_at := v_now;
  return next;
end;
$$;

revoke all on function public.publish_customer_profile(text, text[], text, boolean) from public, anon, authenticated;
grant execute on function public.publish_customer_profile(text, text[], text, boolean) to service_role;
