begin;

alter table public.intelligence_reports
  add column if not exists consumer_publication_state text not null default 'NOT_PUBLISHED'
    check (consumer_publication_state in ('NOT_PUBLISHED','READY_FOR_REVIEW','PUBLISHED','WITHDRAWN')),
  add column if not exists forward_prediction_id text null references public.football_shadow_predictions(id) on delete restrict;

create unique index if not exists intelligence_reports_forward_prediction_unique
  on public.intelligence_reports (forward_prediction_id) where forward_prediction_id is not null;

drop policy if exists reports_member_read on public.intelligence_reports;
create policy reports_member_read on public.intelligence_reports for select to authenticated using (
  status = 'published'
  and consumer_publication_state = 'PUBLISHED'
  and is_demo = false
  and (
    access_level = 'public'
    or (access_level = 'registered' and exists (
      select 1 from public.prediction_usage
      where prediction_usage.user_id = (select auth.uid())
        and (prediction_usage.report_id = intelligence_reports.id or prediction_usage.fixture_id = intelligence_reports.fixture_id)
        and prediction_usage.usage_type in ('report-view','report-unlock')
    ))
    or (access_level = 'premium' and exists (
      select 1 from public.memberships
      where memberships.user_id = (select auth.uid())
        and memberships.plan = 'premium'
        and memberships.status in ('active','trial')
        and (memberships.expires_at is null or memberships.expires_at > now())
    ))
  )
  or public.is_admin()
);

drop policy if exists reports_public_read on public.intelligence_reports;
create policy reports_public_read on public.intelligence_reports for select to anon using (
  status = 'published' and consumer_publication_state = 'PUBLISHED' and access_level = 'public' and is_demo = false
);

drop policy if exists usage_insert_own on public.prediction_usage;
revoke insert on public.prediction_usage from authenticated;

create or replace function public.list_consumer_prediction_catalog()
returns table (report_id uuid, fixture_id uuid, access_level public.content_access_level)
language sql stable security definer set search_path = public, pg_temp
as $$
  select r.id, r.fixture_id, r.access_level
  from public.intelligence_reports r
  join public.fixtures f on f.id = r.fixture_id
  where r.status = 'published'
    and r.consumer_publication_state = 'PUBLISHED'
    and r.is_demo = false
    and f.is_demo = false
  order by f.kickoff_at;
$$;

create or replace function public.unlock_consumer_prediction(p_fixture_id uuid, p_allowance integer default 3)
returns table (report_id uuid, already_unlocked boolean, remaining integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
  v_used integer;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if p_allowance < 0 or p_allowance > 100 then raise exception using errcode = '22023', message = 'invalid_allowance'; end if;

  select r.id into v_report_id
  from public.intelligence_reports r
  where r.fixture_id = p_fixture_id
    and r.status = 'published'
    and r.consumer_publication_state = 'PUBLISHED'
    and r.is_demo = false
    and r.access_level in ('registered','public')
  order by r.generated_at desc nulls last
  limit 1;
  if v_report_id is null then raise exception using errcode = 'P0001', message = 'prediction_not_publishable'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if exists (select 1 from public.prediction_usage where user_id = v_user_id and (report_id = v_report_id or fixture_id = p_fixture_id) and usage_type in ('report-view','report-unlock')) then
    select count(distinct coalesce(report_id::text, fixture_id::text))::integer into v_used from public.prediction_usage where user_id = v_user_id and usage_type in ('report-view','report-unlock');
    return query select v_report_id, true, greatest(0, p_allowance - v_used); return;
  end if;

  select count(distinct coalesce(report_id::text, fixture_id::text))::integer into v_used from public.prediction_usage where user_id = v_user_id and usage_type in ('report-view','report-unlock');
  if v_used >= p_allowance then raise exception using errcode = 'P0001', message = 'allowance_exhausted'; end if;
  insert into public.prediction_usage(user_id, fixture_id, report_id, usage_type) values(v_user_id, p_fixture_id, v_report_id, 'report-unlock');
  return query select v_report_id, false, greatest(0, p_allowance - v_used - 1);
end;
$$;

create unique index if not exists prediction_usage_unique_report_unlock
  on public.prediction_usage (user_id, report_id, usage_type)
  where report_id is not null and usage_type = 'report-unlock';

revoke all on function public.list_consumer_prediction_catalog() from public;
grant execute on function public.list_consumer_prediction_catalog() to anon, authenticated;
revoke all on function public.unlock_consumer_prediction(uuid, integer) from public, anon;
grant execute on function public.unlock_consumer_prediction(uuid, integer) to authenticated;

commit;
