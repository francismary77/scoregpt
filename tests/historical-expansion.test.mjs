import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { historicalLeagueTargets, ingestHistoricalLeague } = await import("../modules/football-data/historical-expansion.ts");
const { MemoryFootballIngestionRepository, MemoryProviderRequestRepository } = await import("../modules/football-data/memory-repositories.ts");
const fetchedAt = "2026-08-08T22:00:00.000Z";
const payload = (target, suffix = target.providerId) => ({ competition: { providerId: target.providerId, name: target.providerName, country: target.country, season: target.season, enabled: false, priority: 100, providerType: "League" }, teams: [{ providerId: `h${suffix}`, competitionProviderId: target.providerId, name: `Home ${suffix}`, shortName: null, logoUrl: null, country: target.country }, { providerId: `a${suffix}`, competitionProviderId: target.providerId, name: `Away ${suffix}`, shortName: null, logoUrl: null, country: target.country }], fixtures: [{ providerId: `f${suffix}`, competitionProviderId: target.providerId, homeTeamProviderId: `h${suffix}`, awayTeamProviderId: `a${suffix}`, kickoffAt: `${target.season}-08-20T12:00:00Z`, status: "finished", homeScore: 2, awayScore: 1 }], snapshots: [], fetchedAt, requestCount: target.metadataRequestRequired ? 3 : 2 });
const provider = (factory = payload) => ({ name: "api-football", async fetchCompetitionData(id, season, categories) { const target = historicalLeagueTargets.find((item) => item.providerId === id && item.season === season); assert.ok(target); assert.deepEqual(categories, target.metadataRequestRequired ? ["metadata", "teams", "fixtures"] : ["teams", "fixtures"]); return factory(target); } });

test("historical targets use isolated verified league-season identities", () => {
  assert.equal(new Set(historicalLeagueTargets.map((item) => `${item.providerId}:${item.season}`)).size, historicalLeagueTargets.length);
  assert.ok(historicalLeagueTargets.every((item) => item.season === "2024" && item.type === "League"));
});

test("multi-league bulk ingestion is isolated and audited", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository();
  for (const target of historicalLeagueTargets.slice(0, 2)) assert.equal((await ingestHistoricalLeague({ target, provider: provider(), repository, requests, dailyBudget: 30, now: new Date(fetchedAt) })).status, "completed");
  assert.deepEqual([repository.competitions.size, repository.teams.size, repository.fixtures.size], [2, 4, 2]); assert.equal(requests.records.length, 2);
});

test("rerunning a league-season preserves stable identities and prevents duplicates", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository(), target = historicalLeagueTargets[0], options = { target, provider: provider(), repository, requests, dailyBudget: 30, now: new Date(fetchedAt) };
  await ingestHistoricalLeague(options); const ids = [...repository.fixtures.values()].map((item) => item.id); await ingestHistoricalLeague(options);
  assert.deepEqual([...repository.fixtures.values()].map((item) => item.id), ids); assert.deepEqual([repository.competitions.size, repository.teams.size, repository.fixtures.size], [1, 2, 1]);
});

test("provider team identity is canonical across competitions with separate memberships", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository(), first = historicalLeagueTargets[0], second = historicalLeagueTargets[1];
  await ingestHistoricalLeague({ target: first, provider: provider(), repository, requests, dailyBudget: 30, now: new Date(fetchedAt) });
  const canonicalId = repository.teams.get(`api-football:h${first.providerId}`).id;
  const conflicting = provider((target) => { const value = payload(target); value.teams[0].providerId = `h${first.providerId}`; value.fixtures[0].homeTeamProviderId = `h${first.providerId}`; return value; });
  assert.equal((await ingestHistoricalLeague({ target: second, provider: conflicting, repository, requests, dailyBudget: 30, now: new Date(fetchedAt) })).status, "completed");
  assert.equal(repository.teams.get(`api-football:h${first.providerId}`).id, canonicalId);
  assert.equal(repository.teamCompetitionSeasons.size, 4);
  assert.equal(repository.competitions.size, 2); assert.equal(repository.fixtures.size, 2);
});

test("unknown teams and malformed identities fail without fixture persistence", async () => {
  const target = historicalLeagueTargets[0], repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository();
  const unknown = provider((item) => { const value = payload(item); value.fixtures[0].awayTeamProviderId = "missing"; return value; });
  assert.equal((await ingestHistoricalLeague({ target, provider: unknown, repository, requests, dailyBudget: 30, now: new Date(fetchedAt) })).status, "failed"); assert.equal(repository.fixtures.size, 0);
  const malformed = provider((item) => ({ ...payload(item), competition: { ...payload(item).competition, name: "Wrong League" } }));
  assert.equal((await ingestHistoricalLeague({ target, provider: malformed, repository: new MemoryFootballIngestionRepository(), requests, dailyBudget: 30, now: new Date(fetchedAt) })).status, "failed");
});

test("budget exhaustion blocks before provider transport", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository(); await requests.recordRequest({ provider: "api-football", category: "competition", endpoint: "prior", requestedAt: fetchedAt, requestCount: 29, succeeded: true, cacheState: "missing", refreshReason: "manual", errorCode: null }); let calls = 0;
  await assert.rejects(() => ingestHistoricalLeague({ target: historicalLeagueTargets[0], provider: provider(() => { calls++; return payload(historicalLeagueTargets[0]); }), repository, requests, dailyBudget: 30, now: new Date(fetchedAt) }), /budget/); assert.equal(calls, 0);
});
