begin;

create or replace function public.list_published_prediction_results()
returns table(
  report_id uuid,
  fixture_id uuid,
  selected_outcome text,
  prediction_market text,
  settlement_status text,
  actual_home_goals integer,
  actual_away_goals integer,
  prediction_correct boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select
    r.id,
    r.fixture_id,
    p.selected_outcome,
    coalesce(p.prediction_market,'MATCH_OUTCOME_1X2'),
    p.settlement_status,
    p.actual_home_goals,
    p.actual_away_goals,
    p.prediction_correct
  from public.intelligence_reports r
  join public.football_shadow_predictions p on p.id=r.forward_prediction_id
  join public.fixtures f on f.id=r.fixture_id
  where r.status='published'
    and r.consumer_publication_state='PUBLISHED'
    and r.is_demo=false
    and p.prediction_market='MATCH_OUTCOME_1X2'
    and f.kickoff_at<=now()
  order by f.kickoff_at desc,r.id;
$$;

revoke all on function public.list_published_prediction_results() from public;
grant execute on function public.list_published_prediction_results() to anon,authenticated,service_role;

commit;
