import "tsx/esm";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { footballCompetitions } = await import("../config/football-data.ts");
const { ApiFootballProvider, EmptyFootballProviderResponseError, FootballProviderResponseError } = await import("../modules/football-data/api-football-provider.ts");
const { FootballBootstrapWorkflow, PREMIER_LEAGUE_STAGE_A } = await import("../modules/football-data/bootstrap.ts");
const { MemoryFootballIngestionRepository, MemoryProviderRequestRepository } = await import("../modules/football-data/memory-repositories.ts");
const { FootballDataIngestionService } = await import("../modules/football-data/service.ts");
const { createFootballVerificationReport } = await import("../modules/football-data/verification.ts");

const now = () => new Date("2026-08-08T10:00:00.000Z");
const competition = { providerId: "39", name: "Premier League", country: "England", season: "2026", enabled: true, priority: 10 };
const teams = [{ providerId: "10", competitionProviderId: "39", name: "Arsenal", shortName: "ARS", logoUrl: null, country: "England" }];
function provider(overrides = {}) { return { name: "api-football", enabled: true, credentialConfigured: true, estimateCompetitionRequests: (categories) => new Set(categories).size, async fetchCompetitionData() { return { competition, teams, fixtures: [], snapshots: [], fetchedAt: now().toISOString(), requestCount: 2 }; }, async fetchFixtureData() { throw new Error("unused"); }, async getFixtures(){return[]}, async getFixture(){return null}, async getTeamForm(teamId){return{teamId,sequence:[],summary:""}}, async getCompetition(){return null}, async getResult(){return null}, ...overrides }; }
function workflow(providerValue = provider(), budget = 30, repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository()) { const ingestion = new FootballDataIngestionService(providerValue, repository, requests, footballCompetitions, budget, now); return { workflow: new FootballBootstrapWorkflow(providerValue, repository, ingestion, footballCompetitions, now), repository, requests }; }

test("Premier League Stage A preflight is narrow, complete, and makes zero provider calls", async () => {
  let calls = 0; const setup = workflow(provider({ async fetchCompetitionData(){calls++;throw new Error("must not execute")}}));
  const plan = await setup.workflow.run("A", { dryRun: true, competitionId: PREMIER_LEAGUE_STAGE_A.competitionId, categories: PREMIER_LEAGUE_STAGE_A.categories });
  const item = plan.items[0];
  assert.deepEqual(item.requestedCategories, ["metadata", "teams"]); assert.equal(item.providerCompetitionId, "39"); assert.equal(item.season, "2026"); assert.equal(item.competitionEnabled, true);
  assert.deepEqual(item.cachedCategories, []); assert.deepEqual(item.staleCategories, []); assert.equal(item.estimatedRequests, 2); assert.equal(item.remainingBudgetBefore, 30); assert.equal(item.remainingBudgetAfter, 28); assert.equal(item.allowed, true); assert.match(item.quotaWarning, /confirmed execution/); assert.equal(calls, 0);
  assert.equal(footballCompetitions.filter((item) => item.enabled).length, 1);
});

test("fresh Stage A cache estimates zero requests", async () => {
  const repository = new MemoryFootballIngestionRepository(); await repository.ingestBundle("api-football", { competition, teams, fixtures: [], snapshots: [], fetchedAt: now().toISOString() });
  const setup = workflow(provider(), 30, repository), plan = await setup.workflow.plan("A", { competitionId: "premier-league" });
  assert.deepEqual(plan.items[0].cachedCategories, ["metadata", "teams"]); assert.deepEqual(plan.items[0].providerRequestCategories, []); assert.equal(plan.estimatedRequests, 0);
});

test("Stage A rejects category expansion beyond metadata and teams", async () => {
  const plan = await workflow().workflow.plan("A", { competitionId: "premier-league", categories: ["metadata", "teams", "fixtures"] });
  assert.equal(plan.items[0].allowed, false); assert.match(plan.items[0].blockedReason, /does not permit: fixtures/);
});

test("live execution requires confirmation, enabled provider, credential, and budget", async () => {
  const normal = workflow();
  await assert.rejects(() => normal.workflow.run("A", { dryRun: false, competitionId: "premier-league" }), /CONSUME_PROVIDER_QUOTA/);
  await assert.rejects(() => normal.workflow.run("A", { dryRun: false, competitionId: "premier-league", confirmation: "WRONG" }), /CONSUME_PROVIDER_QUOTA/);
  await assert.rejects(() => workflow(provider({ enabled: false })).workflow.run("A", { dryRun: false, competitionId: "premier-league", confirmation: "CONSUME_PROVIDER_QUOTA" }), /disabled/);
  await assert.rejects(() => workflow(provider({ credentialConfigured: false })).workflow.run("A", { dryRun: false, competitionId: "premier-league", confirmation: "CONSUME_PROVIDER_QUOTA" }), /credential/);
  const exhausted = workflow(provider(), 1); await assert.rejects(() => exhausted.workflow.run("A", { dryRun: false, competitionId: "premier-league", confirmation: "CONSUME_PROVIDER_QUOTA" }), /budget/);
});

test("confirmed execution uses only the approved mocked Stage A bundle", async () => {
  let calls = 0, categories; const setup = workflow(provider({ async fetchCompetitionData(_id, _season, requested){calls++;categories=requested;return{competition,teams,fixtures:[],snapshots:[],fetchedAt:now().toISOString(),requestCount:2}} }));
  const result = await setup.workflow.run("A", { dryRun: false, competitionId: "premier-league", confirmation: "CONSUME_PROVIDER_QUOTA" });
  assert.equal(result[0].status, "completed"); assert.equal(calls, 1); assert.deepEqual(categories, ["metadata", "teams"]); assert.equal(setup.repository.competitions.size, 1); assert.equal(setup.repository.teams.size, 1);
});

test("malformed, API-error, pagination, and unexpectedly empty envelopes are rejected", async () => {
  const make = (body, status = 200) => new ApiFootballProvider({ apiKey: "test-placeholder-not-a-live-key", enabled: true, transport: async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }) });
  await assert.rejects(() => make({ unexpected: [] }).fetchCompetitionData("39", "2026", ["metadata"]), FootballProviderResponseError);
  await assert.rejects(() => make({ errors: { token: "invalid access" }, response: [] }).fetchCompetitionData("39", "2026", ["metadata"]), /authentication/i);
  await assert.rejects(() => make({ response: [], paging: { current: 2, total: 1 } }).fetchCompetitionData("39", "2026", ["metadata"]), /pagination/i);
  await assert.rejects(() => make({ response: [] }).fetchCompetitionData("39", "2026", ["metadata"]), EmptyFootballProviderResponseError);
  await assert.rejects(() => make("not-json").fetchCompetitionData("39", "2026", ["metadata"]), FootballProviderResponseError);
});

test("verification reads persistence and audit state without a provider", async () => {
  const repository = new MemoryFootballIngestionRepository(), requests = new MemoryProviderRequestRepository();
  await repository.ingestBundle("api-football", { competition, teams, fixtures: [], snapshots: [], fetchedAt: now().toISOString() });
  await requests.recordRequest({ provider:"api-football",category:"competition",endpoint:"mocked-bootstrap",requestedAt:now().toISOString(),requestCount:2,succeeded:true,cacheState:"missing",refreshReason:"manual",errorCode:null });
  const report = await createFootballVerificationReport(repository, requests, footballCompetitions, "premier-league", "api-football", 30, now());
  assert.deepEqual([report.competitionCount, report.teamCount, report.fixtureCount, report.requestAuditRows, report.requestsUsedToday, report.remainingBudget, report.providerCallsMade], [1, 1, 0, 1, 2, 28, 0]);
});

test("provider execution remains server-only and public config exposes no key", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const [env, serverConfig, manual, customer] = await Promise.all([read("../.env.example"), read("../modules/football-data/server-config.ts"), read("../modules/football-data/manual.ts"), Promise.all(["../app/page.tsx","../app/matches/page.tsx","../app/results/page.tsx","../app/competitions/page.tsx"].map(read))]);
  assert.match(env, /^FOOTBALL_API_KEY=$/m); assert.doesNotMatch(env, /^NEXT_PUBLIC_.*FOOTBALL.*(?:KEY|TOKEN|SECRET)/im); assert.match(serverConfig, /@\/lib\/server-only/); assert.match(manual, /@\/lib\/server-only/);
  for (const source of customer) assert.doesNotMatch(source, /football-data\/(?:manual|bootstrap|service|api-football-provider)|CONSUME_PROVIDER_QUOTA|x-apisports-key/);
});
