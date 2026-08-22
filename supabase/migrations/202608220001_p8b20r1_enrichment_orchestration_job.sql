begin;

alter table public.football_orchestration_runs
  drop constraint if exists football_orchestration_runs_job_check;

alter table public.football_orchestration_runs
  add constraint football_orchestration_runs_job_check
  check (job in ('verification','ingestion','enrichment','prediction','publication','settlement'));

create or replace function public.begin_football_orchestration_run(
  p_job text,
  p_environment text,
  p_dry_run boolean,
  p_stale_after_minutes integer default 30
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode='42501', message='orchestration_privilege_required';
  end if;
  if p_job not in ('verification','ingestion','enrichment','prediction','publication','settlement')
     or p_environment not in ('development','production')
     or p_stale_after_minutes < 5 or p_stale_after_minutes > 120 then
    raise exception using errcode='22023', message='invalid_orchestration_parameters';
  end if;
  update public.football_orchestration_runs
     set status='FAILED', completed_at=now(), error_code='STALE_RUN_RECOVERED'
   where job=p_job and environment=p_environment and status='RUNNING'
     and started_at < now()-make_interval(mins=>p_stale_after_minutes);
  begin
    insert into public.football_orchestration_runs(job,environment,status,dry_run)
    values(p_job,p_environment,'RUNNING',p_dry_run) returning id into v_id;
  exception when unique_violation then return null;
  end;
  return v_id;
end $$;

revoke all on function public.begin_football_orchestration_run(text,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.begin_football_orchestration_run(text,text,boolean,integer) to service_role;

commit;
