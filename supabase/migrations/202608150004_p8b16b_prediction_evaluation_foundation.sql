begin;

create table if not exists public.football_competition_verifications(
  id uuid primary key default gen_random_uuid(),provider text not null,internal_competition_id text not null,
  provider_competition_id text not null,provider_name text not null,country text not null,competition_type text,
  season text not null,season_start date not null,season_end date not null,verified_at timestamptz not null default now(),
  unique(provider,internal_competition_id,season),unique(provider,provider_competition_id,season)
);
alter table public.football_competition_verifications enable row level security;
revoke all on public.football_competition_verifications from public,anon,authenticated;
grant all on public.football_competition_verifications to service_role;

alter table public.football_orchestration_runs drop constraint if exists football_orchestration_runs_job_check;
alter table public.football_orchestration_runs add constraint football_orchestration_runs_job_check check(job in ('verification','ingestion','prediction','publication','settlement'));

alter table public.football_shadow_predictions
  add column if not exists prediction_market text check (prediction_market is null or prediction_market = 'MATCH_OUTCOME_1X2'),
  add column if not exists evaluation_rank integer check (evaluation_rank is null or evaluation_rank > 0),
  add column if not exists evaluation_population_size integer check (evaluation_population_size is null or evaluation_population_size > 0),
  add column if not exists evaluation_percentile double precision check (evaluation_percentile is null or evaluation_percentile between 0 and 100),
  add column if not exists evaluation_cohort text check (evaluation_cohort is null or evaluation_cohort in ('TOP_20','WATCHLIST_20','REMAINDER'));

create index if not exists football_shadow_predictions_evaluation_idx
  on public.football_shadow_predictions(evaluation_cohort,evaluation_rank,kickoff_at);

create or replace function public.set_shadow_prediction_market() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.prediction_market is null then new.prediction_market := 'MATCH_OUTCOME_1X2'; end if;
  return new;
end $$;

drop trigger if exists set_shadow_prediction_market on public.football_shadow_predictions;
create trigger set_shadow_prediction_market before insert on public.football_shadow_predictions
for each row execute function public.set_shadow_prediction_market();
revoke all on function public.set_shadow_prediction_market() from public,anon,authenticated;

create or replace view public.football_prediction_evaluation_performance
with (security_invoker=true) as
select p.evaluation_cohort,c.provider_id as provider_competition_id,c.name as competition,
       p.prediction_market,p.selected_outcome as predicted_selection,
       count(*) as total_predictions,
       count(*) filter(where p.settlement_status='SETTLED' and p.prediction_correct=true) as correct,
       count(*) filter(where p.settlement_status='SETTLED' and p.prediction_correct=false) as incorrect,
       count(*) filter(where p.settlement_status in ('VOID','CANCELLED','POSTPONED','ABANDONED')) as void,
       case when count(*) filter(where p.settlement_status='SETTLED')=0 then null
            else count(*) filter(where p.settlement_status='SETTLED' and p.prediction_correct=true)::numeric
                 / count(*) filter(where p.settlement_status='SETTLED') end as hit_rate
from public.football_shadow_predictions p
join public.competitions c on c.id=p.competition_id
where p.evaluation_cohort is not null
group by p.evaluation_cohort,c.provider_id,c.name,p.prediction_market,p.selected_outcome;

revoke all on public.football_prediction_evaluation_performance from public,anon,authenticated;
grant select on public.football_prediction_evaluation_performance to service_role;

create or replace function public.protect_prematch_prediction_evaluation() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.kickoff_at <= now() and
     (new.fixture_id,new.prediction_created_at,new.evidence_cutoff_at,new.prediction_market,new.selected_outcome,
      new.confidence_score_internal,new.methodology_version,new.ranking_position,
      new.evaluation_rank,new.evaluation_population_size,new.evaluation_percentile,new.evaluation_cohort)
     is distinct from
     (old.fixture_id,old.prediction_created_at,old.evidence_cutoff_at,old.prediction_market,old.selected_outcome,
      old.confidence_score_internal,old.methodology_version,old.ranking_position,
      old.evaluation_rank,old.evaluation_population_size,old.evaluation_percentile,old.evaluation_cohort)
  then raise exception using errcode='22023',message='prematch_prediction_evaluation_is_immutable'; end if;
  return new;
end $$;

drop trigger if exists protect_prematch_prediction_evaluation on public.football_shadow_predictions;
create trigger protect_prematch_prediction_evaluation before update on public.football_shadow_predictions
for each row execute function public.protect_prematch_prediction_evaluation();
revoke all on function public.protect_prematch_prediction_evaluation() from public,anon,authenticated;

commit;
