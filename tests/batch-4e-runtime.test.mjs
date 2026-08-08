import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { footballCompetitions } = await import("../config/football-data.ts");
const { ApiFootballProvider, MissingFootballProviderKeyError } = await import("../modules/football-data/api-football-provider.ts");
const { FootballBootstrapWorkflow } = await import("../modules/football-data/bootstrap.ts");
const { MemoryFootballIngestionRepository, MemoryProviderRequestRepository } = await import("../modules/football-data/memory-repositories.ts");
const { FootballDataIngestionService } = await import("../modules/football-data/service.ts");

const now = () => new Date("2026-08-08T10:00:00.000Z");
function response(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
function successfulTransport(log) {
  return async (input) => {
    const url = new URL(String(input)); log.push(`${url.pathname}?${url.searchParams}`);
    if (url.pathname.endsWith("/leagues")) return response({ response: [{ league: { id: 39, name: "Premier League" }, country: { name: "England" } }] });
    if (url.pathname.endsWith("/teams")) return response({ response: [
      { team: { id: 10, name: "Home", code: "HOM", country: "England", logo: null } },
      { team: { id: 20, name: "Away", code: "AWY", country: "England", logo: null } },
    ] });
    if (url.pathname.endsWith("/fixtures")) return response({ response: [{ fixture: { id: 100, date: "2026-08-09T15:00:00Z", status: { short: "NS" } }, league: { id: 39 }, teams: { home: { id: 10 }, away: { id: 20 } }, goals: { home: null, away: null } }] });
    if (url.pathname.endsWith("/standings")) return response({ response: [{ league: { standings: [[{ rank: 1, team: { id: 10, name: "Home" }, points: 3, goalsDiff: 2, all: { played: 1 }, form: "W" }]] } }] });
    return response({ response: [] });
  };
}

test("disabled and missing-key adapters make zero external calls", async () => {
  let calls = 0; const transport = async () => { calls++; return response({ response: [] }); };
  const disabled = new ApiFootballProvider({ apiKey: null, enabled: false, transport });
  await assert.rejects(() => disabled.fetchCompetitionData("39", "2026"));
  const missing = new ApiFootballProvider({ apiKey: null, enabled: true, transport });
  await assert.rejects(() => missing.fetchCompetitionData("39", "2026"), MissingFootballProviderKeyError);
  assert.equal(calls, 0);
});

test("normalized API-Football responses persist idempotently without raw envelopes", async () => {
  const calls = [], provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: successfulTransport(calls), now });
  const payload = await provider.fetchCompetitionData("39", "2026", ["metadata", "teams", "fixtures", "standings"]);
  assert.equal(payload.requestCount, 4); assert.equal(payload.competition.name, "Premier League"); assert.equal(payload.teams.length, 2); assert.equal(payload.fixtures[0].status, "scheduled"); assert.ok(payload.snapshots.some((item) => item.category === "other"));
  assert.deepEqual(Object.keys(payload).sort(), ["competition", "fetchedAt", "fixtures", "requestCount", "snapshots", "teams"]);
  const repository = new MemoryFootballIngestionRepository(); await repository.ingestBundle(provider.name, payload); const firstId = [...repository.fixtures.values()][0].id; await repository.ingestBundle(provider.name, payload);
  assert.deepEqual([repository.competitions.size, repository.teams.size, repository.fixtures.size, repository.snapshots.size], [1, 2, 1, 2]); assert.equal([...repository.fixtures.values()][0].id, firstId); assert.equal(calls.length, 4);
});

test("dry-run plans staged ingestion and makes zero provider calls", async () => {
  let calls = 0;
  const provider = { name: "api-football", enabled: true, estimateCompetitionRequests: (categories) => categories.length, async fetchCompetitionData() { calls++; throw new Error("must not run"); }, async fetchFixtureData() { calls++; throw new Error("must not run"); }, async getFixtures(){return[]},async getFixture(){return null},async getTeamForm(teamId){return{teamId,sequence:[],summary:""}},async getCompetition(){return null},async getResult(){return null} };
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository(), ingestion = new FootballDataIngestionService(provider, repository, requests, footballCompetitions, 10, now);
  const workflow = new FootballBootstrapWorkflow(provider, repository, ingestion, footballCompetitions), plan = await workflow.run("A", { dryRun: true });
  assert.equal(plan.dryRun, true); assert.equal(plan.configuredDailyBudget, 10); assert.ok(plan.items.some((item) => item.competitionId === "premier-league" && item.categories.includes("teams"))); assert.equal(calls, 0); assert.equal(requests.records.length, 0);
});

test("budget exhaustion blocks calls and failed calls are audited", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository();
  await requests.recordRequest({ provider: "api-football", category: "competition", endpoint: "prior", requestedAt: now().toISOString(), requestCount: 10, succeeded: true, cacheState: "missing", refreshReason: "manual", errorCode: null });
  let calls = 0; const provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async () => { calls++; return response({}, 500); }, now });
  const enabledPremierLeague = [{ ...footballCompetitions.find((item) => item.id === "premier-league"), enabled: true }];
  const service = new FootballDataIngestionService(provider, repository, requests, enabledPremierLeague, 10, now);
  assert.equal((await service.ingestCompetition("premier-league")).status, "skipped"); assert.equal(calls, 0);
  const freshRequests = new MemoryProviderRequestRepository(), failedService = new FootballDataIngestionService(provider, repository, freshRequests, enabledPremierLeague, 10, now);
  assert.equal((await failedService.ingestCompetition("premier-league", "manual", ["metadata"])).status, "degraded"); assert.equal(calls, 1); assert.equal(freshRequests.records[0].succeeded, false); assert.equal(freshRequests.records[0].requestCount, 1);
  const quota = await failedService.getQuotaStatus(); assert.deepEqual([quota.providerAttempts, quota.failures, quota.remainingBudget], [1, 1, 9]);
});
