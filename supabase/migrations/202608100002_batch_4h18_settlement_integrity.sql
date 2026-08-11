begin;

alter table public.football_shadow_predictions
  drop constraint if exists football_shadow_predictions_settlement_status_check;

alter table public.football_shadow_predictions
  add constraint football_shadow_predictions_settlement_status_check
  check (settlement_status in ('PENDING', 'SETTLED', 'VOID', 'CANCELLED', 'POSTPONED', 'ABANDONED', 'UNKNOWN_FINAL_STATE'));

create or replace function public.protect_shadow_prediction_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(
    new.id, new.run_id, new.fixture_id, new.provider_fixture_id, new.competition_id,
    new.provider_competition_id, new.season, new.home_team_id, new.away_team_id,
    new.kickoff_at, new.prediction_created_at, new.evidence_cutoff_at,
    new.selected_outcome, new.home_probability, new.draw_probability,
    new.away_probability, new.methodology_key, new.methodology_version,
    new.confidence_version, new.confidence_score_internal, new.confidence_label,
    new.publishing_tier_calculated, new.publishing_policy_version,
    new.ranking_scope, new.ranking_date, new.ranking_position,
    new.eligible_population_size, new.is_top_pick_calculated,
    new.operational_publication_state, new.shadow_mode, new.methodology_snapshot,
    new.created_at
  ) is distinct from row(
    old.id, old.run_id, old.fixture_id, old.provider_fixture_id, old.competition_id,
    old.provider_competition_id, old.season, old.home_team_id, old.away_team_id,
    old.kickoff_at, old.prediction_created_at, old.evidence_cutoff_at,
    old.selected_outcome, old.home_probability, old.draw_probability,
    old.away_probability, old.methodology_key, old.methodology_version,
    old.confidence_version, old.confidence_score_internal, old.confidence_label,
    old.publishing_tier_calculated, old.publishing_policy_version,
    old.ranking_scope, old.ranking_date, old.ranking_position,
    old.eligible_population_size, old.is_top_pick_calculated,
    old.operational_publication_state, old.shadow_mode, old.methodology_snapshot,
    old.created_at
  ) then
    raise exception 'SHADOW_PREDICTION_IMMUTABLE_FIELD_CHANGE';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_shadow_prediction_evidence on public.football_shadow_predictions;
create trigger protect_shadow_prediction_evidence
before update on public.football_shadow_predictions
for each row execute function public.protect_shadow_prediction_evidence();

revoke all on function public.protect_shadow_prediction_evidence() from public, anon, authenticated;

commit;
