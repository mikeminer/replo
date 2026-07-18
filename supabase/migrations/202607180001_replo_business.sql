create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Production',
  prefix text not null,
  hash text not null unique,
  last_four text not null,
  created_by uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_id text not null unique,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  path text not null,
  method text not null,
  units integer not null default 1 check (units > 0),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_org_created_idx on public.usage_events (organization_id, created_at);

create table if not exists public.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  external_id text not null,
  type text not null,
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.api_keys enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
alter table public.webhook_events enable row level security;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = target_organization_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "organizations_read_member" on public.organizations;
create policy "organizations_read_member" on public.organizations for select to authenticated using (public.is_organization_member(id));
drop policy if exists "memberships_read_member" on public.memberships;
create policy "memberships_read_member" on public.memberships for select to authenticated using (public.is_organization_member(organization_id));
drop policy if exists "api_keys_read_member" on public.api_keys;
create policy "api_keys_read_member" on public.api_keys for select to authenticated using (public.is_organization_member(organization_id));
drop policy if exists "subscriptions_read_member" on public.subscriptions;
create policy "subscriptions_read_member" on public.subscriptions for select to authenticated using (public.is_organization_member(organization_id));
drop policy if exists "usage_read_member" on public.usage_events;
create policy "usage_read_member" on public.usage_events for select to authenticated using (public.is_organization_member(organization_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
  organization_name text;
  organization_slug text;
begin
  organization_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), split_part(new.email, '@', 1));
  organization_slug := lower(regexp_replace(organization_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  insert into public.organizations (name, slug)
  values (organization_name, organization_slug)
  returning id into new_organization_id;
  insert into public.memberships (organization_id, user_id, role)
  values (new_organization_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.authorize_api_key(p_key_hash text, p_path text, p_method text)
returns table (
  organization_id uuid,
  organization_name text,
  organization_plan text,
  monthly_send_count integer,
  monthly_resolve_count integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_key public.api_keys%rowtype;
  matched_organization public.organizations%rowtype;
  used_units integer;
  monthly_limit integer;
begin
  select * into matched_key
  from public.api_keys
  where hash = p_key_hash and revoked_at is null
  for update;

  if matched_key.id is null then
    raise exception using errcode = 'P0001', message = 'invalid_api_key';
  end if;

  select * into matched_organization from public.organizations where id = matched_key.organization_id;
  monthly_limit := case when matched_organization.plan = 'pro' then 10000 else 100 end;
  select coalesce(sum(usage_row.units), 0)::integer into used_units
  from public.usage_events as usage_row
  where usage_row.organization_id = matched_organization.id
    and usage_row.created_at >= date_trunc('month', now());

  if used_units >= monthly_limit then
    raise exception using errcode = 'P0001', message = 'api_quota_exceeded';
  end if;

  update public.api_keys set last_used_at = now() where id = matched_key.id;
  insert into public.usage_events (organization_id, api_key_id, path, method)
  values (matched_organization.id, matched_key.id, left(p_path, 500), upper(left(p_method, 12)));

  return query select
    matched_organization.id,
    matched_organization.name,
    matched_organization.plan,
    0,
    0,
    greatest(monthly_limit - used_units - 1, 0);
end;
$$;

revoke all on function public.authorize_api_key(text, text, text) from public, anon, authenticated;
grant execute on function public.authorize_api_key(text, text, text) to service_role;

grant usage on schema public to authenticated, service_role;
grant select on public.profiles, public.organizations, public.memberships, public.api_keys, public.subscriptions, public.usage_events to authenticated;
grant select, insert, update, delete on public.profiles, public.organizations, public.memberships, public.api_keys, public.subscriptions, public.usage_events, public.webhook_events to service_role;
grant usage, select on all sequences in schema public to service_role;
