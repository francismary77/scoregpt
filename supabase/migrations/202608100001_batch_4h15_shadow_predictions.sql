begin;

create table if not exists public.football_shadow_runs (
  id text primary key,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  mode text not null check (mode in ('DRY_RUN', 'SHADOW_PERSIST')),
  source_type text not null default 'PERSISTED_DATABASE' check (source_type in ('PERSISTED_DATABASE', 'PERSISTED_DATABASE_WITH_PROVIDER_REFRESH')),
  operational_status text not null default 'COMPLETED' check (operational_status in ('COMPLETED', 'PARTIAL', 'FAILED')),
  horizon_start timestamptz not null,
  horizon_end timestamptz not null,
  fixtures_found integer not null default 0 check (fixtures_found >= 0),
  fixtures_eligible integer not null default 0 check (fixtures_eligible >= 0),
  predictions_created integer not null default 0 check (predictions_created >= 0),
  predictions_persisted integer not null default 0 check (predictions_persisted >= 0),
  predictions_reused integer not null default 0 check (predictions_reused >= 0),
  predictions_skipped integer not null default 0 check (predictions_skipped >= 0),
  top_picks_calculated integer not null default 0 check (top_picks_calculated >= 0),
  provider_requests integer not null default 0 check (provider_requests >= 0),
  errors_count integer not null default 0 check (errors_count >= 0),
  methodology_version text not null,
  confidence_version text not null,
  policy_version text not null,
  failure_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.football_shadow_predictions (
  id text primary key,
  run_id text not null,
  fixture_id uuid not null references public.fixtures(id) on delete restrict,
  provider_fixture_id text not null,
  competition_id uuid not null references public.competitions(id) on delete restrict,
  provider_competition_id text not null,
  season text not null,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  kickoff_at timestamptz not null,
  prediction_created_at timestamptz not null,
  evidence_cutoff_at timestamptz not null,
  selected_outcome text not null check (selected_outcome in ('home', 'draw', 'away')),
  home_probability double precision not null check (home_probability between 0 and 1),
  draw_probability double precision not null check (draw_probability between 0 and 1),
  away_probability double precision not null check (away_probability between 0 and 1),
  methodology_key text not null,
  methodology_version text not null,
  confidence_version text not null,
  confidence_score_internal double precision not null check (confidence_score_internal between 0 and 1),
  confidence_label text not null check (confidence_label in ('LOW', 'MODERATE', 'STRONG')),
  publishing_tier_calculated text not null check (publishing_tier_calculated in ('TOP_PICK', 'STANDARD_ANALYSIS', 'LIMITED_EVIDENCE')),
  publishing_policy_version text not null,
  ranking_scope text not null check (ranking_scope = 'DAILY_GLOBAL'),
  ranking_date date not null,
  ranking_position integer check (ranking_position is null or ranking_position > 0),
  eligible_population_size integer not null default 0 check (eligible_population_size >= 0),
  is_top_pick_calculated boolean not null default false,
  operational_publication_state text not null default 'SHADOW_ONLY' check (operational_publication_state in ('SHADOW_ONLY', 'SUPPRESSED')),
  shadow_mode boolean not null default true check (shadow_mode = true),
  settlement_status text not null default 'PENDING' check (settlement_status in ('PENDING', 'SETTLED', 'VOID', 'CANCELLED', 'POSTPONED')),
  actual_home_goals integer check (actual_home_goals is null or actual_home_goals >= 0),
  actual_away_goals integer check (actual_away_goals is null or actual_away_goals >= 0),
  actual_outcome text check (actual_outcome is null or actual_outcome in ('home', 'draw', 'away')),
  prediction_correct boolean,
  settled_at timestamptz,
  methodology_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint football_shadow_probabilities_sum check (abs((home_probability + draw_probability + away_probability) - 1) <= 0.001),
  constraint football_shadow_pre_kickoff check (prediction_created_at < kickoff_at and evidence_cutoff_at <= prediction_created_at),
  constraint football_shadow_identity unique (fixture_id, methodology_version, publishing_policy_version, shadow_mode)
);

create index if not exists football_shadow_predictions_ranking_idx on public.football_shadow_predictions (ranking_date, publishing_tier_calculated, ranking_position);
create index if not exists football_shadow_predictions_settlement_idx on public.football_shadow_predictions (settlement_status, kickoff_at);
create index if not exists football_shadow_predictions_run_idx on public.football_shadow_predictions (run_id);

alter table public.football_shadow_runs enable row level security;
alter table public.football_shadow_predictions enable row level security;
revoke all on table public.football_shadow_runs from public, anon, authenticated;
revoke all on table public.football_shadow_predictions from public, anon, authenticated;

comment on table public.football_shadow_predictions is 'Private immutable pre-kickoff forward predictions. No public grants or publication trigger.';
comment on column public.football_shadow_predictions.confidence_score_internal is 'Private relative reliability score; not a calibrated probability of success.';

commit;
