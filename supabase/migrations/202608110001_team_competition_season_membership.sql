begin;

-- Canonical teams are globally identified by (provider, provider_id). A team can
-- participate in many competition-season rows without changing that identity.
create table if not exists public.team_competition_seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  competition_id uuid not null references public.competitions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, competition_id)
);

create index if not exists team_competition_seasons_competition_idx
  on public.team_competition_seasons (competition_id, team_id);

insert into public.team_competition_seasons (team_id, competition_id)
select id, competition_id
from public.teams
where competition_id is not null
on conflict (team_id, competition_id) do nothing;

create or replace function public.validate_team_competition_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  team_provider text;
  competition_provider text;
begin
  select provider into team_provider from public.teams where id = new.team_id;
  select provider into competition_provider from public.competitions where id = new.competition_id;
  if team_provider is null or competition_provider is null or team_provider <> competition_provider then
    raise exception 'Team and competition providers must match.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_team_competition_membership_trigger on public.team_competition_seasons;
create trigger validate_team_competition_membership_trigger
before insert or update on public.team_competition_seasons
for each row execute function public.validate_team_competition_membership();

alter table public.team_competition_seasons enable row level security;
revoke all on table public.team_competition_seasons from anon, authenticated;

comment on table public.team_competition_seasons is
  'Private season-aware membership between canonical provider teams and competition-season rows.';
comment on column public.teams.competition_id is
  'Legacy compatibility pointer. New writes use team_competition_seasons and must not overwrite this value.';

commit;
