import "tsx/esm";
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const { MemoryFootballIngestionRepository } = await import("../modules/football-data/memory-repositories.ts");
const fetchedAt = "2026-08-11T00:00:00.000Z";
const competition = (providerId, season, name = "League") => ({ providerId, name, country: "Test", season, enabled: false, priority: 1 });
const shared = { providerId: "529", competitionProviderId: "140", name: "Barcelona", shortName: "BAR", logoUrl: null, country: "Spain" };
const opponent = (id, competitionProviderId) => ({ providerId: id, competitionProviderId, name: `Team ${id}`, shortName: null, logoUrl: null, country: "Spain" });
const fixture = (id, competitionProviderId, home, away, year) => ({ providerId: id, competitionProviderId, homeTeamProviderId: home, awayTeamProviderId: away, kickoffAt: `${year}-08-15T17:30:00.000Z`, status: "scheduled", homeScore: null, awayScore: null });

test("same provider team remains one canonical identity across seasons", async () => {
  const repository = new MemoryFootballIngestionRepository();
  await repository.ingestBundle("api-football", { competition: competition("140", "2024", "La Liga"), teams: [shared], fixtures: [], snapshots: [], fetchedAt });
  const id = repository.teams.get("api-football:529").id;
  await repository.ingestBundle("api-football", { competition: competition("140", "2026", "La Liga"), teams: [shared], fixtures: [], snapshots: [], fetchedAt });
  assert.equal(repository.teams.size, 1);
  assert.equal(repository.teams.get("api-football:529").id, id);
  assert.equal(repository.teamCompetitionSeasons.size, 2);
});

test("same provider team can join another competition without duplication", async () => {
  const repository = new MemoryFootballIngestionRepository();
  await repository.ingestBundle("api-football", { competition: competition("140", "2026", "La Liga"), teams: [shared], fixtures: [], snapshots: [], fetchedAt });
  await repository.ingestBundle("api-football", { competition: competition("2", "2026", "Champions League"), teams: [{ ...shared, competitionProviderId: "2" }], fixtures: [], snapshots: [], fetchedAt });
  assert.equal(repository.teams.size, 1);
  assert.equal(repository.teamCompetitionSeasons.size, 2);
});

test("promoted team membership and fixture persistence are season-aware and idempotent", async () => {
  const repository = new MemoryFootballIngestionRepository(), promoted = opponent("999", "140"), rival = opponent("533", "140"), item = fixture("1570339", "140", "999", "533", "2026"), payload = { competition: competition("140", "2026", "La Liga"), teams: [promoted, rival], fixtures: [item], snapshots: [], fetchedAt };
  await repository.ingestBundle("api-football", payload);
  const fixtureId = repository.fixtures.get("api-football:1570339").id;
  await repository.ingestBundle("api-football", payload);
  assert.equal(repository.teams.size, 2);
  assert.equal(repository.fixtures.size, 1);
  assert.equal(repository.fixtures.get("api-football:1570339").id, fixtureId);
  assert.equal(repository.teamCompetitionSeasons.size, 2);
});

test("migration is additive, private, backfills legacy membership and preserves provider uniqueness", () => {
  const migration = fs.readFileSync("supabase/migrations/202608110001_team_competition_season_membership.sql", "utf8"), foundation = fs.readFileSync("supabase/migrations/202608070001_batch_4a_foundation.sql", "utf8"), shadow = fs.readFileSync("supabase/migrations/202608100001_batch_4h15_shadow_predictions.sql", "utf8");
  assert.match(migration, /create table if not exists public\.team_competition_seasons/);
  assert.match(migration, /unique \(team_id, competition_id\)/);
  assert.match(migration, /select id, competition_id\s+from public\.teams/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* anon, authenticated/);
  assert.doesNotMatch(migration, /drop table|delete from public\.teams|alter table public\.teams drop/);
  assert.match(foundation, /unique \(provider, provider_id\)/);
  assert.match(shadow, /home_team_id uuid not null references public\.teams\(id\)/);
  assert.match(shadow, /away_team_id uuid not null references public\.teams\(id\)/);
});

test("Supabase persistence resolves memberships without overwriting legacy competition identity", () => {
  const repository = fs.readFileSync("modules/persistence/football-repositories.ts", "utf8"), source = fs.readFileSync("modules/persistence/shadow-fixture-source.ts", "utf8");
  assert.match(repository, /from\("team_competition_seasons"\)\.upsert/);
  assert.doesNotMatch(repository, /team identity is already associated with another competition/);
  assert.doesNotMatch(repository, /provider_id: team\.providerId, competition_id: competitionId/);
  assert.match(source, /from\("team_competition_seasons"\)/);
});
