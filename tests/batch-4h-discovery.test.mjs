import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { ApiFootballProvider } = await import("../modules/football-data/api-football-provider.ts");
const { discoverScottishPremiership } = await import("../modules/football-data/discovery.ts");
const { runProviderAuthenticationCheck } = await import("../modules/football-data/authentication.ts");
const { MemoryProviderRequestRepository } = await import("../modules/football-data/memory-repositories.ts");
const { MemoryFootballIngestionRepository } = await import("../modules/football-data/memory-repositories.ts");
const { FootballDataIngestionService } = await import("../modules/football-data/service.ts");
const { footballCompetitions } = await import("../config/football-data.ts");

const now = new Date("2026-08-08T08:00:00Z");
const envelope = (response) => new Response(JSON.stringify({ response }), { status: 200, headers: { "content-type": "application/json" } });
const scottish = { league: { id: 999999, name: "Premiership" }, country: { name: "Scotland" }, seasons: [{ year: 2026, start: "2026-08-01", end: "2027-05-31", current: true }] };

test("controlled Scottish discovery uses one mocked transport call and one audit request", async () => {
  let calls = 0, requestedUrl = ""; const requests = new MemoryProviderRequestRepository();
  const provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async (input) => { calls++; requestedUrl = String(input); return envelope([scottish]); } });
  const result = await discoverScottishPremiership({ provider, requests, dailyBudget: 30, confirmation: "DISCOVER_SCOTTISH_PREMIERSHIP", now });
  assert.equal(calls, 1); assert.equal(requests.records.length, 1); assert.equal(requests.records[0].requestCount, 1); assert.equal(requests.records[0].succeeded, true);
  assert.match(requestedUrl, /country=Scotland/); assert.doesNotMatch(requestedUrl, /search=/); assert.match(requestedUrl, /season=2026/);
  assert.deepEqual([result.competitionName, result.country, result.providerCompetitionId, result.season], ["Premiership", "Scotland", "999999", "2026"]);
});

test("development discovery can explicitly target August 2024 without changing the production default", async () => {
  let requestedUrl = ""; const requests = new MemoryProviderRequestRepository(), provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async (input) => { requestedUrl = String(input); return envelope([{ league: { id: 999999, name: "Premiership" }, country: { name: "Scotland" }, seasons: [{ year: 2024, start: "2024-08-01", end: "2025-05-31", current: false }] }]); } });
  const result = await discoverScottishPremiership({ provider, requests, dailyBudget: 30, confirmation: "DISCOVER_SCOTTISH_PREMIERSHIP", season: "2024", now });
  assert.match(requestedUrl, /season=2024/); assert.match(requestedUrl, /country=Scotland/); assert.doesNotMatch(requestedUrl, /search=/); assert.equal(result.season, "2024"); assert.equal(requests.records[0].endpoint, "leagues-discovery:scotland-premiership-2024");
});

test("discovery blocks before transport without confirmation or budget", async () => {
  let calls = 0; const provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async () => { calls++; return envelope([scottish]); } });
  await assert.rejects(() => discoverScottishPremiership({ provider, requests: new MemoryProviderRequestRepository(), dailyBudget: 30, confirmation: "WRONG", now }), /confirmation/);
  const exhausted = new MemoryProviderRequestRepository(); await exhausted.recordRequest({ provider:"api-football",category:"competition",endpoint:"prior",requestedAt:now.toISOString(),requestCount:30,succeeded:true,cacheState:"missing",refreshReason:"manual",errorCode:null });
  await assert.rejects(() => discoverScottishPremiership({ provider, requests: exhausted, dailyBudget: 30, confirmation: "DISCOVER_SCOTTISH_PREMIERSHIP", now }), /budget/); assert.equal(calls, 0);
});

test("ambiguous discovery stops after one mocked request and audits failure", async () => {
  let calls = 0; const requests = new MemoryProviderRequestRepository(), provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async () => { calls++; return envelope([scottish, { ...scottish, league: { id: 999, name: "Scottish Premiership" } }]); } });
  await assert.rejects(() => discoverScottishPremiership({ provider, requests, dailyBudget: 30, confirmation: "DISCOVER_SCOTTISH_PREMIERSHIP", now }), /ambiguous/); assert.equal(calls, 1); assert.equal(requests.records.length, 1); assert.equal(requests.records[0].succeeded, false);
});

test("authentication probe uses one mocked status request and returns safe quota metadata", async () => {
  let calls = 0, path = ""; const requests = new MemoryProviderRequestRepository(), provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async (input) => { calls++; path = new URL(String(input)).pathname; return new Response(JSON.stringify({ response: { account: { firstname: "hidden" } } }), { status: 200, headers: { "x-ratelimit-requests-limit": "100", "x-ratelimit-requests-remaining": "96" } }); } });
  const result = await runProviderAuthenticationCheck({ provider, requests, dailyBudget: 30, confirmation: "CHECK_API_FOOTBALL_AUTH", now });
  assert.equal(path, "/status"); assert.equal(calls, 1); assert.deepEqual(result, { httpStatus: 200, keyAccepted: true, dailyLimit: 100, dailyRemaining: 96, requestCount: 1 }); assert.equal(requests.records[0].requestCount, 1);
});

test("authentication probe reports safe HTTP failure after one mocked request", async () => {
  let calls = 0; const requests = new MemoryProviderRequestRepository(), provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async () => { calls++; return new Response(JSON.stringify({ errors: { token: "invalid" }, response: [] }), { status: 401 }); } });
  await assert.rejects(() => runProviderAuthenticationCheck({ provider, requests, dailyBudget: 30, confirmation: "CHECK_API_FOOTBALL_AUTH", now }), (error) => error.name === "FootballProviderAuthenticationError" && error.httpStatus === 401); assert.equal(calls, 1); assert.equal(requests.records[0].succeeded, false);
});

test("API-level errors retain distinct safe categories without leaking secrets", async () => {
  const testSecret = "unit-test-secret-value-1234567890";
  async function classified(errors) {
    const provider = new ApiFootballProvider({ apiKey: testSecret, enabled: true, transport: async () => new Response(JSON.stringify({ errors, response: [] }), { status: 200 }) });
    try { await provider.fetchCompetitionData("999999", "2026", ["metadata"]); assert.fail("Expected provider error"); } catch (error) { return error; }
  }
  const authentication = await classified({ token: `Invalid API key ${testSecret}` });
  const quota = await classified({ requests: "Daily request limit reached." });
  const access = await classified({ access: "This endpoint is not available on the Free plan." });
  const season = await classified({ season: "Season 2026 is not available." });
  const generic = await classified({ service: "Temporary provider condition." });
  assert.deepEqual([authentication.providerCategory, quota.providerCategory, access.providerCategory, season.providerCategory, generic.providerCategory], ["authentication", "quota", "subscription", "invalid-season", "provider-api"]);
  assert.notEqual(access.name, "FootballProviderAuthenticationError");
  for (const error of [authentication, quota, access, season, generic]) { assert.ok(error.providerCode); assert.ok(error.safeDiagnostic); assert.doesNotMatch(`${error.message} ${error.safeDiagnostic}`, new RegExp(testSecret)); }
});

test("malformed provider JSON has a distinct response category", async () => {
  const provider = new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async () => new Response("not-json", { status: 200 }) });
  await assert.rejects(() => provider.fetchCompetitionData("999999", "2026", ["metadata"]), (error) => error.providerCategory === "malformed-response" && error.providerCode === "malformed_response");
});

test("Stage A rejects mismatched competition identity before persistence", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository(), provider = { name:"api-football",enabled:true,credentialConfigured:true,estimateCompetitionRequests:()=>2,async fetchCompetitionData(){return{competition:{providerId:"179",name:"Different League",country:"Scotland",season:"2024",enabled:true,priority:100,providerType:"League"},teams:[],fixtures:[],snapshots:[],fetchedAt:now.toISOString(),requestCount:2}},async fetchFixtureData(){throw new Error("unused")},async getFixtures(){return[]},async getFixture(){return null},async getTeamForm(teamId){return{teamId,sequence:[],summary:""}},async getCompetition(){return null},async getResult(){return null} };
  const service = new FootballDataIngestionService(provider, repository, requests, footballCompetitions, 30, () => now), result = await service.ingestCompetition("scottish-premiership", "manual", ["metadata","teams"]);
  assert.equal(result.status,"degraded"); assert.equal(repository.competitions.size,0); assert.equal(repository.teams.size,0); assert.equal(requests.records[0].requestCount,2);
});
