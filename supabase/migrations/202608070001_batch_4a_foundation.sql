begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('user', 'admin');
create type public.account_status as enum ('active', 'suspended', 'disabled');
create type public.content_access_level as enum ('public', 'registered', 'premium');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  email text,
  role public.app_role not null default 'user',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'trial', 'none')),
  starts_at timestamptz,
  expires_at timestamptz,
  source text not null default 'manual',
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, provider_reference)
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  provider_id text,
  provider text not null default 'internal',
  name text not null,
  country text,
  season text not null,
  enabled boolean not null default true,
  priority integer not null default 100 check (priority >= 0),
  tier text not null default 'standard',
  last_synced_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_id, season)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  provider_id text,
  provider text not null default 'internal',
  competition_id uuid references public.competitions(id) on delete set null,
  name text not null,
  short_name text,
  logo_url text,
  country text,
  last_synced_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_id)
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  provider_fixture_id text,
  provider text not null default 'internal',
  competition_id uuid not null references public.competitions(id) on delete restrict,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  home_score smallint check (home_score is null or home_score >= 0),
  away_score smallint check (away_score is null or away_score >= 0),
  source text not null default 'internal',
  last_synced_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id),
  unique (provider, provider_fixture_id)
);

create table public.football_data_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  data_type text not null check (data_type in ('form', 'standings', 'injuries', 'lineups', 'h2h', 'statistics', 'other')),
  payload jsonb not null default '{}'::jsonb,
  provider text not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  source_reference text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fixture_id, data_type, provider)
);

create table public.intelligence_reports (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  provider text not null default 'mock-ai',
  provider_version text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived', 'failed')),
  recommended_market text,
  confidence numeric(5,2) check (confidence is null or confidence between 0 and 100),
  risk_level text check (risk_level is null or risk_level in ('low', 'medium', 'high')),
  reasoning text,
  analysis jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  source_data_fetched_at timestamptz,
  source_reference text,
  access_level public.content_access_level not null default 'public',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prediction_markets (
  id uuid primary key default gen_random_uuid(),
  intelligence_report_id uuid not null references public.intelligence_reports(id) on delete cascade,
  market_type text not null,
  prediction text not null,
  confidence numeric(5,2) not null check (confidence between 0 and 100),
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  reasoning text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intelligence_report_id, market_type)
);

create table public.prediction_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete set null,
  report_id uuid references public.intelligence_reports(id) on delete set null,
  usage_type text not null default 'report-view',
  created_at timestamptz not null default now(),
  check (fixture_id is not null or report_id is not null)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  brand_name text,
  package_id text not null,
  package_name text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  payment_method text not null,
  status text not null default 'pending-payment' check (status in ('pending-payment', 'payment-submitted', 'payment-verified', 'payment-rejected', 'cancelled', 'completed')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  reference text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, reference)
);

create index memberships_user_status_idx on public.memberships (user_id, status);
create index prediction_usage_user_created_idx on public.prediction_usage (user_id, created_at desc);
create index competitions_enabled_priority_idx on public.competitions (enabled, priority);
create index teams_competition_idx on public.teams (competition_id);
create index fixtures_kickoff_idx on public.fixtures (kickoff_at);
create index fixtures_competition_kickoff_idx on public.fixtures (competition_id, kickoff_at);
create index snapshots_freshness_idx on public.football_data_snapshots (fixture_id, data_type, expires_at);
create index reports_fixture_generated_idx on public.intelligence_reports (fixture_id, generated_at desc);
create index reports_access_status_idx on public.intelligence_reports (access_level, status);
create index prediction_markets_report_sort_idx on public.prediction_markets (intelligence_report_id, sort_order);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index transactions_order_idx on public.payment_transactions (order_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
      and account_status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','memberships','competitions','teams','fixtures','football_data_snapshots','intelligence_reports','prediction_markets','orders','payment_transactions']
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.prediction_usage enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.fixtures enable row level security;
alter table public.football_data_snapshots enable row level security;
alter table public.intelligence_reports enable row level security;
alter table public.prediction_markets enable row level security;
alter table public.orders enable row level security;
alter table public.payment_transactions enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = (select auth.uid()) or public.is_admin()) with check (user_id = (select auth.uid()) or public.is_admin());
create policy memberships_select_own on public.memberships for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy usage_select_own on public.prediction_usage for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy usage_insert_own on public.prediction_usage for insert to authenticated with check (user_id = (select auth.uid()));
create policy orders_select_own on public.orders for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy transactions_select_own_order on public.payment_transactions for select to authenticated using (exists (select 1 from public.orders where orders.id = payment_transactions.order_id and (orders.user_id = (select auth.uid()) or public.is_admin())));

create policy competitions_public_read on public.competitions for select to anon, authenticated using (enabled);
create policy competitions_admin_read on public.competitions for select to authenticated using (public.is_admin());
create policy teams_public_read on public.teams for select to anon, authenticated using (true);
create policy fixtures_public_read on public.fixtures for select to anon, authenticated using (true);
create policy reports_public_read on public.intelligence_reports for select to anon using (status = 'published' and access_level = 'public');
create policy reports_member_read on public.intelligence_reports for select to authenticated using (
  status = 'published' and (
    access_level in ('public', 'registered')
    or (access_level = 'premium' and exists (
      select 1 from public.memberships
      where memberships.user_id = (select auth.uid())
        and memberships.plan = 'premium'
        and memberships.status in ('active', 'trial')
        and (memberships.expires_at is null or memberships.expires_at > now())
    ))
  ) or public.is_admin()
);
create policy markets_read_with_report on public.prediction_markets for select to anon, authenticated using (
  exists (select 1 from public.intelligence_reports where intelligence_reports.id = prediction_markets.intelligence_report_id)
);

grant usage on schema public to anon, authenticated;
grant select on public.competitions, public.teams, public.fixtures, public.intelligence_reports, public.prediction_markets to anon, authenticated;
grant select on public.profiles, public.memberships, public.prediction_usage, public.orders, public.payment_transactions to authenticated;
grant insert on public.prediction_usage to authenticated;
grant update (display_name) on public.profiles to authenticated;

commit;
