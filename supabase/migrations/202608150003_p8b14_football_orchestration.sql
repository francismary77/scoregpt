begin;
create table if not exists public.football_orchestration_runs (
  id uuid primary key default gen_random_uuid(), job text not null check (job in ('ingestion','prediction','publication','settlement')),
  environment text not null check (environment in ('development','production')), status text not null check (status in ('RUNNING','COMPLETED','SKIPPED','FAILED')),
  dry_run boolean not null default true, started_at timestamptz not null default now(), completed_at timestamptz,
  provider_requests integer not null default 0 check (provider_requests >= 0), records_examined integer not null default 0 check (records_examined >= 0),
  records_changed integer not null default 0 check (records_changed >= 0), summary jsonb not null default '{}'::jsonb, error_code text
);
create unique index if not exists football_orchestration_one_running_job on public.football_orchestration_runs(environment, job) where status = 'RUNNING';
create index if not exists football_orchestration_recent on public.football_orchestration_runs(environment, job, started_at desc);
alter table public.football_orchestration_runs enable row level security;
revoke all on table public.football_orchestration_runs from public, anon, authenticated;
create or replace function public.begin_football_orchestration_run(p_job text, p_environment text, p_dry_run boolean, p_stale_after_minutes integer default 30) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode='42501', message='orchestration_privilege_required'; end if;
  if p_job not in ('ingestion','prediction','publication','settlement') or p_environment not in ('development','production') or p_stale_after_minutes < 5 or p_stale_after_minutes > 120 then raise exception using errcode='22023', message='invalid_orchestration_parameters'; end if;
  update public.football_orchestration_runs set status='FAILED', completed_at=now(), error_code='STALE_RUN_RECOVERED' where job=p_job and environment=p_environment and status='RUNNING' and started_at < now()-make_interval(mins=>p_stale_after_minutes);
  begin insert into public.football_orchestration_runs(job,environment,status,dry_run) values(p_job,p_environment,'RUNNING',p_dry_run) returning id into v_id;
  exception when unique_violation then return null; end;
  return v_id;
end $$;
create or replace function public.finish_football_orchestration_run(p_run_id uuid,p_status text,p_provider_requests integer,p_records_examined integer,p_records_changed integer,p_summary jsonb default '{}'::jsonb,p_error_code text default null) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode='42501', message='orchestration_privilege_required'; end if;
  if p_status not in ('COMPLETED','SKIPPED','FAILED') or least(p_provider_requests,p_records_examined,p_records_changed) < 0 then raise exception using errcode='22023', message='invalid_orchestration_result'; end if;
  update public.football_orchestration_runs set status=p_status,completed_at=now(),provider_requests=p_provider_requests,records_examined=p_records_examined,records_changed=p_records_changed,summary=coalesce(p_summary,'{}'::jsonb),error_code=p_error_code where id=p_run_id and status='RUNNING';
  return found;
end $$;
revoke all on function public.begin_football_orchestration_run(text,text,boolean,integer) from public,anon,authenticated;
revoke all on function public.finish_football_orchestration_run(uuid,text,integer,integer,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.begin_football_orchestration_run(text,text,boolean,integer) to service_role;
grant execute on function public.finish_football_orchestration_run(uuid,text,integer,integer,integer,jsonb,text) to service_role;
commit;
