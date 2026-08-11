begin;

-- Consumer entitlement is keyed exclusively by the canonical internal fixture UUID.
-- The lifetime free allowance is trusted database policy, never caller input.
drop function if exists public.unlock_consumer_prediction(uuid, integer);

create or replace function public.unlock_consumer_prediction(p_fixture_id uuid)
returns table (report_id uuid, already_unlocked boolean, remaining integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
  v_used integer;
  v_allowance constant integer := 3;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select r.id into v_report_id
  from public.intelligence_reports r
  join public.fixtures f on f.id = r.fixture_id
  where r.fixture_id = p_fixture_id
    and r.status = 'published'
    and r.consumer_publication_state = 'PUBLISHED'
    and r.is_demo = false
    and f.is_demo = false
    and r.access_level in ('registered','public')
  order by r.generated_at desc nulls last
  limit 1;

  if v_report_id is null then
    raise exception using errcode = 'P0001', message = 'prediction_not_publishable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if exists (
    select 1 from public.prediction_usage
    where user_id = v_user_id
      and fixture_id = p_fixture_id
      and usage_type in ('report-view','report-unlock')
  ) then
    select count(distinct fixture_id)::integer into v_used
    from public.prediction_usage
    where user_id = v_user_id
      and fixture_id is not null
      and usage_type in ('report-view','report-unlock');
    return query select v_report_id, true, greatest(0, v_allowance - v_used);
    return;
  end if;

  select count(distinct fixture_id)::integer into v_used
  from public.prediction_usage
  where user_id = v_user_id
    and fixture_id is not null
    and usage_type in ('report-view','report-unlock');

  if v_used >= v_allowance then
    raise exception using errcode = 'P0001', message = 'allowance_exhausted';
  end if;

  insert into public.prediction_usage(user_id, fixture_id, report_id, usage_type)
  values(v_user_id, p_fixture_id, v_report_id, 'report-unlock');

  return query select v_report_id, false, greatest(0, v_allowance - v_used - 1);
end;
$$;

revoke all on function public.unlock_consumer_prediction(uuid) from public, anon;
grant execute on function public.unlock_consumer_prediction(uuid) to authenticated;

-- Atomically maps one immutable genuine shadow prediction into a private draft
-- consumer report. Only the service-role server boundary can execute it.
create or replace function public.prepare_consumer_prediction(
  p_forward_prediction_id text,
  p_access_level public.content_access_level default 'registered'
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_shadow public.football_shadow_predictions%rowtype;
  v_fixture public.fixtures%rowtype;
  v_competition public.competitions%rowtype;
  v_home public.teams%rowtype;
  v_away public.teams%rowtype;
  v_existing public.intelligence_reports%rowtype;
  v_report_id uuid;
  v_selected_probability double precision;
  v_prediction text;
  v_risk text;
  v_reasoning text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'publication_privilege_required';
  end if;

  select * into v_shadow from public.football_shadow_predictions
  where id = p_forward_prediction_id for share;
  if not found then raise exception using errcode = 'P0002', message = 'shadow_prediction_not_found'; end if;

  select * into v_fixture from public.fixtures where id = v_shadow.fixture_id for share;
  select * into v_competition from public.competitions where id = v_shadow.competition_id for share;
  select * into v_home from public.teams where id = v_shadow.home_team_id for share;
  select * into v_away from public.teams where id = v_shadow.away_team_id for share;

  if v_fixture.id is null or v_competition.id is null or v_home.id is null or v_away.id is null then
    raise exception using errcode = 'P0001', message = 'publication_identity_unresolved';
  end if;
  if v_shadow.shadow_mode is not true or v_shadow.operational_publication_state <> 'SHADOW_ONLY' then
    raise exception using errcode = 'P0001', message = 'shadow_prediction_not_publishable';
  end if;
  if v_fixture.is_demo or v_competition.is_demo or v_home.is_demo or v_away.is_demo then
    raise exception using errcode = 'P0001', message = 'demo_prediction_not_publishable';
  end if;
  if v_fixture.provider_fixture_id is null or v_competition.provider_id is null
    or v_home.provider_id is null or v_away.provider_id is null then
    raise exception using errcode = 'P0001', message = 'publication_provider_identity_unresolved';
  end if;
  if v_shadow.settlement_status <> 'PENDING' then
    raise exception using errcode = 'P0001', message = 'shadow_prediction_not_pending';
  end if;
  if v_fixture.competition_id <> v_shadow.competition_id
    or v_fixture.home_team_id <> v_shadow.home_team_id
    or v_fixture.away_team_id <> v_shadow.away_team_id
    or v_fixture.provider_fixture_id is distinct from v_shadow.provider_fixture_id
    or v_competition.provider_id is distinct from v_shadow.provider_competition_id
    or v_competition.season <> v_shadow.season
    or v_fixture.kickoff_at <> v_shadow.kickoff_at then
    raise exception using errcode = 'P0001', message = 'publication_identity_mismatch';
  end if;
  if now() >= v_shadow.kickoff_at then
    raise exception using errcode = 'P0001', message = 'publication_after_kickoff';
  end if;
  if v_shadow.evidence_cutoff_at > v_shadow.prediction_created_at
    or v_shadow.prediction_created_at >= v_shadow.kickoff_at then
    raise exception using errcode = 'P0001', message = 'invalid_prediction_timeline';
  end if;

  select * into v_existing from public.intelligence_reports
  where forward_prediction_id = v_shadow.id;
  if v_existing.id is not null then
    if v_existing.fixture_id <> v_shadow.fixture_id
      or v_existing.is_demo
      or v_existing.access_level <> p_access_level
      or v_existing.source_reference is distinct from 'football_shadow_predictions:' || v_shadow.id
      or v_existing.analysis ->> 'forwardPredictionId' is distinct from v_shadow.id
      or not exists (select 1 from public.prediction_markets where intelligence_report_id = v_existing.id) then
      raise exception using errcode = 'P0001', message = 'existing_consumer_report_conflict';
    end if;
    return v_existing.id;
  end if;

  v_selected_probability := case v_shadow.selected_outcome
    when 'home' then v_shadow.home_probability
    when 'draw' then v_shadow.draw_probability
    else v_shadow.away_probability end;
  v_prediction := case v_shadow.selected_outcome
    when 'home' then v_home.name
    when 'draw' then 'Draw'
    else v_away.name end;
  v_risk := case v_shadow.confidence_label
    when 'STRONG' then 'low'
    when 'MODERATE' then 'medium'
    else 'high' end;
  v_reasoning := format(
    'The frozen %s model selected %s from completed evidence available before %s. This is a probabilistic model output, not a guarantee.',
    v_shadow.methodology_version,
    v_prediction,
    to_char(v_shadow.evidence_cutoff_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI UTC')
  );

  insert into public.intelligence_reports(
    fixture_id, provider, provider_version, status, recommended_market,
    confidence, risk_level, reasoning, analysis, generated_at,
    source_data_fetched_at, source_reference, access_level, is_demo,
    consumer_publication_state, forward_prediction_id
  ) values (
    v_shadow.fixture_id, 'deterministic-historical-model', v_shadow.methodology_version,
    'draft', 'Match Winner', round((v_selected_probability * 100)::numeric, 2),
    v_risk, v_reasoning,
    jsonb_build_object(
      'kind', 'frozen-forward-prediction-v1',
      'selectedOutcome', v_shadow.selected_outcome,
      'probabilities', jsonb_build_object(
        'home', v_shadow.home_probability,
        'draw', v_shadow.draw_probability,
        'away', v_shadow.away_probability
      ),
      'confidence', jsonb_build_object(
        'label', v_shadow.confidence_label,
        'scoreInternal', v_shadow.confidence_score_internal,
        'explanation', 'Relative reliability classification; not a calibrated guarantee.'
      ),
      'publication', jsonb_build_object(
        'tier', v_shadow.publishing_tier_calculated,
        'isTopPick', v_shadow.is_top_pick_calculated,
        'policyVersion', v_shadow.publishing_policy_version
      ),
      'methodology', jsonb_build_object(
        'key', v_shadow.methodology_key,
        'version', v_shadow.methodology_version,
        'confidenceVersion', v_shadow.confidence_version
      ),
      'evidence', jsonb_build_object(
        'cutoffAt', v_shadow.evidence_cutoff_at,
        'predictionCreatedAt', v_shadow.prediction_created_at
      ),
      'forwardPredictionId', v_shadow.id
    ),
    v_shadow.prediction_created_at, v_shadow.evidence_cutoff_at,
    'football_shadow_predictions:' || v_shadow.id, p_access_level, false,
    'NOT_PUBLISHED', v_shadow.id
  ) returning id into v_report_id;

  insert into public.prediction_markets(
    intelligence_report_id, market_type, prediction, confidence,
    risk_level, reasoning, sort_order
  ) values (
    v_report_id, 'Match Winner', v_prediction,
    round((v_selected_probability * 100)::numeric, 2), v_risk,
    v_reasoning, 0
  );

  return v_report_id;
end;
$$;

create or replace function public.transition_consumer_prediction(
  p_report_id uuid,
  p_target_state text
)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_report public.intelligence_reports%rowtype;
  v_shadow public.football_shadow_predictions%rowtype;
  v_fixture public.fixtures%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'publication_privilege_required';
  end if;
  if p_target_state not in ('NOT_PUBLISHED','READY_FOR_REVIEW','PUBLISHED','WITHDRAWN') then
    raise exception using errcode = '22023', message = 'invalid_publication_state';
  end if;

  select * into v_report from public.intelligence_reports where id = p_report_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'consumer_report_not_found'; end if;
  if v_report.forward_prediction_id is null or v_report.is_demo then
    raise exception using errcode = 'P0001', message = 'consumer_report_not_publishable';
  end if;
  if v_report.consumer_publication_state = p_target_state then return p_target_state; end if;

  if not (
    (v_report.consumer_publication_state = 'NOT_PUBLISHED' and p_target_state = 'READY_FOR_REVIEW')
    or (v_report.consumer_publication_state = 'READY_FOR_REVIEW' and p_target_state in ('NOT_PUBLISHED','PUBLISHED'))
    or (v_report.consumer_publication_state = 'PUBLISHED' and p_target_state = 'WITHDRAWN')
    or (v_report.consumer_publication_state = 'WITHDRAWN' and p_target_state = 'READY_FOR_REVIEW')
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_publication_transition';
  end if;

  select * into v_shadow from public.football_shadow_predictions where id = v_report.forward_prediction_id;
  select * into v_fixture from public.fixtures where id = v_report.fixture_id;
  if v_shadow.id is null or v_fixture.id is null
    or v_shadow.fixture_id <> v_report.fixture_id
    or v_shadow.operational_publication_state <> 'SHADOW_ONLY'
    or v_shadow.shadow_mode is not true
    or v_fixture.is_demo then
    raise exception using errcode = 'P0001', message = 'publication_integrity_failure';
  end if;
  if p_target_state = 'PUBLISHED' then
    if now() >= v_shadow.kickoff_at then
      raise exception using errcode = 'P0001', message = 'publication_after_kickoff';
    end if;
    if not exists (select 1 from public.prediction_markets where intelligence_report_id = v_report.id) then
      raise exception using errcode = 'P0001', message = 'publication_market_missing';
    end if;
  end if;

  update public.intelligence_reports
  set consumer_publication_state = p_target_state,
      status = case p_target_state when 'PUBLISHED' then 'published' when 'WITHDRAWN' then 'archived' else 'draft' end,
      updated_at = now()
  where id = p_report_id;
  return p_target_state;
end;
$$;

revoke all on function public.prepare_consumer_prediction(text, public.content_access_level) from public, anon, authenticated;
revoke all on function public.transition_consumer_prediction(uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_consumer_prediction(text, public.content_access_level) to service_role;
grant execute on function public.transition_consumer_prediction(uuid, text) to service_role;

commit;
