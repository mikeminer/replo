-- Replo Business paid tiers: Startup, Partner and Enterprise.
-- The legacy `pro` tier becomes Partner so existing sandbox customers keep access.

alter table public.organizations drop constraint if exists organizations_plan_check;
update public.organizations set plan = 'partner' where plan = 'pro';
alter table public.organizations add constraint organizations_plan_check
  check (plan in ('free', 'startup', 'partner', 'enterprise'));

alter table public.subscriptions add column if not exists plan text not null default 'free';
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
update public.subscriptions set plan = 'partner'
where plan = 'free' and status in ('active', 'trialing');
alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('free', 'startup', 'partner', 'enterprise'));

alter table public.user_api_credentials drop constraint if exists user_api_credentials_organization_plan_check;
update public.user_api_credentials set organization_plan = 'partner' where organization_plan = 'pro';
alter table public.user_api_credentials add constraint user_api_credentials_organization_plan_check
  check (organization_plan in ('free', 'startup', 'partner', 'enterprise'));

create or replace function public.enforce_api_key_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_plan text;
  active_key_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 0));
  select plan into organization_plan from public.organizations where id = new.organization_id;

  if organization_plan = 'free' then
    raise exception using errcode = 'P0001', message = 'api_plan_required';
  end if;

  if organization_plan in ('startup', 'partner') then
    select count(*)::integer into active_key_count
    from public.api_keys
    where organization_id = new.organization_id and revoked_at is null;
    if active_key_count >= 1 then
      raise exception using errcode = 'P0001', message = 'api_key_limit_reached';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_api_key_plan_limit_before_insert on public.api_keys;
create trigger enforce_api_key_plan_limit_before_insert
  before insert on public.api_keys
  for each row execute procedure public.enforce_api_key_plan_limit();

create or replace function public.reconcile_api_keys_after_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan = 'free' then
    update public.api_keys set revoked_at = now()
    where organization_id = new.id and revoked_at is null;
  elsif new.plan in ('startup', 'partner') then
    update public.api_keys set revoked_at = now()
    where organization_id = new.id
      and revoked_at is null
      and id not in (
        select id from public.api_keys
        where organization_id = new.id and revoked_at is null
        order by created_at asc, id asc
        limit 1
      );
  end if;
  return new;
end;
$$;

drop trigger if exists reconcile_api_keys_after_plan_change on public.organizations;
create trigger reconcile_api_keys_after_plan_change
  after update of plan on public.organizations
  for each row when (old.plan is distinct from new.plan)
  execute procedure public.reconcile_api_keys_after_plan_change();

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
  monthly_limit := case
    when matched_organization.plan = 'startup' then 300
    when matched_organization.plan in ('partner', 'enterprise') then null
    else 0
  end;

  select coalesce(sum(usage_row.units), 0)::integer into used_units
  from public.usage_events as usage_row
  where usage_row.organization_id = matched_organization.id
    and usage_row.created_at >= date_trunc('month', now());

  if monthly_limit is not null and used_units >= monthly_limit then
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
    case when monthly_limit is null then null else greatest(monthly_limit - used_units - 1, 0) end;
end;
$$;

revoke all on function public.enforce_api_key_plan_limit() from public, anon, authenticated;
grant execute on function public.enforce_api_key_plan_limit() to service_role;
revoke all on function public.reconcile_api_keys_after_plan_change() from public, anon, authenticated;
grant execute on function public.reconcile_api_keys_after_plan_change() to service_role;
revoke all on function public.authorize_api_key(text, text, text) from public, anon, authenticated;
grant execute on function public.authorize_api_key(text, text, text) to service_role;
