begin;

alter table public.football_data_snapshots
  drop constraint if exists football_data_snapshots_data_type_check;
alter table public.football_data_snapshots
  add constraint football_data_snapshots_data_type_check
  check (data_type in ('form', 'standings', 'injuries', 'lineups', 'h2h', 'statistics', 'odds', 'other'));

create table if not exists public.football_provider_requests (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  category text not null,
  endpoint text not null,
  requested_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count >= 0),
  succeeded boolean not null,
  cache_state text not null check (cache_state in ('fresh', 'stale', 'missing')),
  refresh_reason text not null check (refresh_reason in ('scheduled', 'manual', 'missing', 'stale', 'near-match', 'live')),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists football_provider_requests_budget_idx
  on public.football_provider_requests (provider, requested_at desc);
create index if not exists football_provider_requests_category_idx
  on public.football_provider_requests (category, requested_at desc);

alter table public.football_provider_requests enable row level security;

revoke all on table public.football_provider_requests from public, anon, authenticated;

-- Ingestion is server-admin only. No anon/authenticated policy or grant is added.
-- A later scheduler must use a separately configured privileged server client.

comment on table public.football_provider_requests is
  'Server-side football provider request/cache audit used to enforce future daily budgets.';

commit;
