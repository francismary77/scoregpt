import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { footballCompetitions } = await import("../config/football-data.ts");
const { cacheState, expiresAtFor, freshnessLifetimeMs } = await import("../modules/football-data/freshness.ts");
const { normalizeFixture, normalizeMatchStatus } = await import("../modules/football-data/normalization.ts");
const { MemoryFootballIngestionRepository, MemoryProviderRequestRepository } = await import("../modules/football-data/memory-repositories.ts");
const { DisabledFootballDataProvider } = await import("../modules/football-data/providers.ts");
const { FootballDataIngestionService } = await import("../modules/football-data/service.ts");

const fetchedAt = "2026-08-08T10:00:00.000Z";
const kickoffAt = "2026-08-09T15:00:00.000Z";
const competition = { providerId: "39", name: "Premier League", country: "England", season: "2026", enabled: true, priority: 10 };
const teams = [
  { providerId: "10", competitionProviderId: "39", name: "Home", shortName: "HOM", logoUrl: null, country: "England" },
  { providerId: "20", competitionProviderId: "39", name: "Away", shortName: "AWY", logoUrl: null, country: "England" },
];
const fixture = { providerId: "100", competitionProviderId: "39", homeTeamProviderId: "10", awayTeamProviderId: "20", kickoffAt, status: "scheduled", homeScore: null, awayScore: null };
const snapshot = { fixtureProviderId: "100", category: "form", payload: { sequence: ["W"] }, providerReference: "fixtures/100/form", fetchedAt };

test("provider values normalize without leaking provider-specific statuses", () => {
  assert.equal(normalizeMatchStatus("FT"), "finished");
  assert.equal(normalizeMatchStatus("NS"), "scheduled");
  const normalized = normalizeFixture({ id: 100, competitionId: 39, homeTeamId: 10, awayTeamId: 20, kickoffAt, status: "1H" });
  assert.deepEqual([normalized.providerId, normalized.status], ["100", "live"]);
});

test("freshness differentiates live, near-match, upcoming and finished data", () => {
  const now = new Date(fetchedAt);
  const nearKickoff = "2026-08-08T11:00:00.000Z";
  assert.ok(freshnessLifetimeMs("statistics", "live", kickoffAt, now) < freshnessLifetimeMs("statistics", "scheduled", kickoffAt, now));
  assert.ok(freshnessLifetimeMs("statistics", "scheduled", nearKickoff, now) < freshnessLifetimeMs("statistics", "scheduled", kickoffAt, now));
  assert.equal(freshnessLifetimeMs("statistics", "finished", kickoffAt, now), null);
  assert.equal(expiresAtFor("statistics", "finished", kickoffAt, fetchedAt), null);
  assert.equal(cacheState(null, now), "fresh");
  const expiry = expiresAtFor("form", "scheduled", kickoffAt, fetchedAt);
  assert.equal(cacheState(expiry, now), "fresh");
  assert.equal(cacheState(expiry, new Date("2026-08-10T10:00:00.000Z")), "stale");
});

test("idempotent ingestion deduplicates provider IDs while retaining internal UUIDs", async () => {
  const repository = new MemoryFootballIngestionRepository();
  const payload = { competition, teams, fixtures: [fixture], snapshots: [snapshot], fetchedAt };
  await repository.ingestBundle("future-provider", payload);
  await repository.ingestBundle("future-provider", payload);
  assert.deepEqual([repository.competitions.size, repository.teams.size, repository.fixtures.size, repository.snapshots.size], [1, 2, 1, 1]);
  const stored = [...repository.fixtures.values()][0];
  assert.notEqual(stored.id, stored.providerId);
  assert.match(stored.id, /^[0-9a-f-]{36}$/i);
});

test("fixture-only ingestion links teams already persisted by Stage A", async () => {
  const repository = new MemoryFootballIngestionRepository();
  await repository.ingestBundle("future-provider", { competition, teams, fixtures: [], snapshots: [], fetchedAt });
  await repository.ingestBundle("future-provider", { competition, teams: [], fixtures: [fixture], snapshots: [snapshot], fetchedAt });
  assert.equal(repository.teams.size, 2); assert.equal(repository.fixtures.size, 1); assert.equal(repository.snapshots.size, 1);
});

test("disabled competitions and disabled provider degrade without external calls", async () => {
  const repository = new MemoryFootballIngestionRepository();
  const requests = new MemoryProviderRequestRepository();
  const service = new FootballDataIngestionService(new DisabledFootballDataProvider(), repository, requests, [{ ...footballCompetitions[0], enabled: false }], 1);
  assert.equal((await service.ingestCompetition("premier-league")).status, "skipped");
  const enabledService = new FootballDataIngestionService(new DisabledFootballDataProvider(), repository, requests, [{ ...footballCompetitions[0], enabled: true }], 1);
  assert.equal((await enabledService.ingestCompetition("premier-league")).status, "degraded");
  assert.equal(requests.records.length, 0);
});

test("cache hits spend no budget and provider failures preserve stale data", async () => {
  const repository = new MemoryFootballIngestionRepository();
  const requests = new MemoryProviderRequestRepository();
  await repository.ingestBundle("test-provider", { competition, teams, fixtures: [fixture], snapshots: [snapshot], fetchedAt });
  const fixtureId = [...repository.fixtures.values()][0].id;
  repository.snapshots.values().next().value.provenance.expiresAt = "2099-01-01T00:00:00.000Z";
  const provider = {
    name: "test-provider", enabled: true,
    async fetchFixtureData() { throw new Error("provider down"); },
    async fetchCompetitionData() { throw new Error("provider down"); },
    async getFixtures() { return []; }, async getFixture() { return null; }, async getTeamForm(teamId) { return { teamId, sequence: [], summary: "" }; }, async getCompetition() { return null; }, async getResult() { return null; },
  };
  const now = () => new Date("2026-08-08T11:00:00.000Z");
  const service = new FootballDataIngestionService(provider, repository, requests, footballCompetitions, 1, now);
  assert.ok(await service.getSnapshot(fixtureId, fixture.providerId, "form"));
  assert.equal(requests.records[0].requestCount, 0);
  repository.snapshots.values().next().value.provenance.expiresAt = "2000-01-01T00:00:00.000Z";
  const later = new FootballDataIngestionService(provider, repository, requests, footballCompetitions, 1, () => new Date("2026-08-10T11:00:00.000Z"));
  assert.ok(await later.getSnapshot(fixtureId, fixture.providerId, "form"));
  assert.equal(requests.records.at(-1).succeeded, false);
  const requestCount = requests.records.length;
  assert.ok(await later.getSnapshot(fixtureId, fixture.providerId, "form"));
  assert.equal(requests.records.length, requestCount, "exhausted budget prevents another provider attempt");
  const provenance = [...repository.snapshots.values()][0].provenance;
  assert.deepEqual([provenance.provider, provenance.providerReference, provenance.fetchedAt], ["test-provider", "fixtures/100/form", fetchedAt]);
});

test("repository outage is graceful while the live provider is disabled", async () => {
  const repository = { async getSnapshot() { throw new Error("database unavailable"); } };
  const service = new FootballDataIngestionService(new DisabledFootballDataProvider(), repository, new MemoryProviderRequestRepository(), footballCompetitions, 100);
  assert.equal(await service.getSnapshot("internal-id", "provider-id", "form"), null);
});

test("concurrent stale reads share one provider refresh", async () => {
  const repository = new MemoryFootballIngestionRepository();
  const requests = new MemoryProviderRequestRepository();
  await repository.ingestBundle("test-provider", { competition, teams, fixtures: [fixture], snapshots: [snapshot], fetchedAt });
  const fixtureId = [...repository.fixtures.values()][0].id;
  repository.snapshots.values().next().value.provenance.expiresAt = "2000-01-01T00:00:00.000Z";
  let calls = 0;
  const provider = {
    name: "test-provider", enabled: true,
    async fetchFixtureData() { calls += 1; await new Promise((resolve) => setTimeout(resolve, 10)); return { fixture, snapshots: [snapshot], fetchedAt }; },
    async fetchCompetitionData() { throw new Error("unused"); },
    async getFixtures() { return []; }, async getFixture() { return null; }, async getTeamForm(teamId) { return { teamId, sequence: [], summary: "" }; }, async getCompetition() { return null; }, async getResult() { return null; },
  };
  const service = new FootballDataIngestionService(provider, repository, requests, footballCompetitions, 100, () => new Date("2026-08-10T11:00:00.000Z"));
  const [first, second] = await Promise.all([
    service.getSnapshot(fixtureId, fixture.providerId, "form"),
    service.getSnapshot(fixtureId, fixture.providerId, "form"),
  ]);
  assert.ok(first && second);
  assert.equal(calls, 1);
});
test("successful empty enrichment is audited separately from persistence", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository();
  await repository.ingestBundle("test-provider", { competition, teams, fixtures: [fixture], snapshots: [], fetchedAt });
  const fixtureId = [...repository.fixtures.values()][0].id, diagnostics = [];
  const provider = {
    name: "test-provider", enabled: true, estimateFixtureRequests: () => 2,
    async fetchFixtureData() { return { fixture, snapshots: [], fetchedAt, requestCount: 2, providerIdentity: { fixtureId: fixture.providerId, leagueId: fixture.competitionProviderId, season: "2026", homeTeamId: fixture.homeTeamProviderId, awayTeamId: fixture.awayTeamProviderId } }; },
    async fetchCompetitionData() { throw new Error("unused"); },
    async getFixtures() { return []; }, async getFixture() { return null; }, async getTeamForm(teamId) { return { teamId, sequence: [], summary: "" }; }, async getCompetition() { return null; }, async getResult() { return null; },
  };
  const service = new FootballDataIngestionService(provider, repository, requests, footballCompetitions, 100, () => new Date("2026-08-10T11:00:00.000Z"));
  assert.equal(await service.getSnapshot(fixtureId, fixture.providerId, "h2h", "scheduled", item => diagnostics.push(item)), null);
  assert.deepEqual([diagnostics[0].status, diagnostics[0].requestCount, diagnostics[0].errorCode], ["EMPTY", 2, "NO_DATA_AVAILABLE"]);
  assert.deepEqual([requests.records[0].succeeded, requests.records[0].requestCount, requests.records[0].errorCode], [true, 2, "NO_DATA_AVAILABLE"]);
  assert.equal(repository.snapshots.size, 0);
});