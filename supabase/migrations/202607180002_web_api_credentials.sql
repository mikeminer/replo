create table if not exists public.user_api_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_api_key text not null,
  key_prefix text not null,
  last_four text not null,
  organization_name text not null,
  organization_plan text not null check (organization_plan in ('free', 'pro')),
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_api_credentials enable row level security;
revoke all on public.user_api_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.user_api_credentials to service_role;
