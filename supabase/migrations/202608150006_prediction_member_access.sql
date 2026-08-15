begin;

drop policy if exists reports_member_read on public.intelligence_reports;
create policy reports_member_read on public.intelligence_reports for select to authenticated using (
  status='published' and consumer_publication_state='PUBLISHED' and is_demo=false and (
    access_level='public'
    or exists (select 1 from public.prediction_usage where prediction_usage.user_id=(select auth.uid()) and (prediction_usage.report_id=intelligence_reports.id or prediction_usage.fixture_id=intelligence_reports.fixture_id) and prediction_usage.usage_type in ('report-view','report-unlock'))
    or (access_level='premium' and exists (select 1 from public.memberships where memberships.user_id=(select auth.uid()) and memberships.plan='premium' and memberships.status in ('active','trial') and (memberships.expires_at is null or memberships.expires_at>now())))
  ) or public.is_admin()
);

create or replace function public.unlock_consumer_prediction(p_fixture_id uuid)
returns table(report_id uuid,already_unlocked boolean,remaining integer)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid();v_report_id uuid;v_used integer;v_allowance constant integer:=3;
begin
  if v_user_id is null then raise exception using errcode='42501',message='authentication_required';end if;
  select r.id into v_report_id from public.intelligence_reports r join public.fixtures f on f.id=r.fixture_id where r.fixture_id=p_fixture_id and r.status='published' and r.consumer_publication_state='PUBLISHED' and r.is_demo=false and f.is_demo=false and r.access_level in ('public','registered','premium') order by r.generated_at desc nulls last limit 1;
  if v_report_id is null then raise exception using errcode='P0001',message='prediction_not_publishable';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text,0));
  if exists(select 1 from public.prediction_usage where user_id=v_user_id and fixture_id=p_fixture_id and usage_type in ('report-view','report-unlock'))then
    select count(distinct fixture_id)::integer into v_used from public.prediction_usage where user_id=v_user_id and fixture_id is not null and usage_type in ('report-view','report-unlock');
    return query select v_report_id,true,greatest(0,v_allowance-v_used);return;
  end if;
  select count(distinct fixture_id)::integer into v_used from public.prediction_usage where user_id=v_user_id and fixture_id is not null and usage_type in ('report-view','report-unlock');
  if v_used>=v_allowance then raise exception using errcode='P0001',message='allowance_exhausted';end if;
  insert into public.prediction_usage(user_id,fixture_id,report_id,usage_type)values(v_user_id,p_fixture_id,v_report_id,'report-unlock');
  return query select v_report_id,false,greatest(0,v_allowance-v_used-1);
end;$$;

revoke all on function public.unlock_consumer_prediction(uuid) from public,anon;
grant execute on function public.unlock_consumer_prediction(uuid) to authenticated;
commit;
