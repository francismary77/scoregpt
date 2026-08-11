import "tsx/esm";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ApiFootballProvider, safeProviderErrorDetails } from "../modules/football-data/api-football-provider.ts";
import { ACTIVE_LEAGUE_CANDIDATES, verifyCandidateIdentity, windowDates, eligibleFutureFixtures, buildInMemoryShadowSource } from "../modules/football-intelligence/active-league-zero-write.ts";
import { MemoryShadowPredictionRepository, MemoryShadowRunRepository, runShadowPredictionPipeline } from "../modules/football-intelligence/shadow-pipeline/index.ts";

function envFile(path) { const result = {}; for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match) result[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, ""); } return result; }
const env = envFile(".env.local"), required = ["FOOTBALL_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
if (required.some((key) => !env[key])) throw new Error("Required server-only configuration is missing.");
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "oislplqdvtaajqxbwvut") throw new Error("WRONG_SUPABASE_PROJECT");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const count = async (table) => { const { count: value, error } = await supabase.from(table).select("id", { count: "exact", head: true }); if (error) throw new Error(`Read-only ${table} count failed.`); return value ?? 0; };
const databaseBefore = { shadowPredictions: await count("football_shadow_predictions"), shadowRuns: await count("football_shadow_runs"), competitions: await count("competitions"), teams: await count("teams"), fixtures: await count("fixtures") };
const startedAt = new Date().toISOString(), audits = [];
const provider = new ApiFootballProvider({ apiKey: env.FOOTBALL_API_KEY, enabled: true, now: () => new Date(startedAt), onRequest: (audit) => audits.push({ number: audits.length + 1, ...audit, retry: false }) });
const ensureBudget = (needed = 1) => { if (audits.length + needed > 30) throw new Error("PREFERRED_PROVIDER_REQUEST_CEILING_REACHED"); };
ensureBudget(); const authentication = await provider.checkAuthentication();
const checked = [], sources = [];
for (const candidate of ACTIVE_LEAGUE_CANDIDATES) {
  if (sources.length >= 8 || audits.length >= 30) break;
  const item = { candidate, identity: null, season: null, teams: [], fixtures72: [], fixtures168: [], history: [], source: null, decision: "REJECTED", reason: null };
  try {
    ensureBudget(); const rows = await provider.discoverCurrentCompetitions(candidate.country), verified = verifyCandidateIdentity(candidate, rows, startedAt);
    if (!verified.ok) { item.reason = verified.reason; checked.push(item); continue; }
    item.identity = verified.competition; item.season = verified.season;
    ensureBudget(); const w72 = windowDates(startedAt, 72), response72 = await provider.fetchCompetitionFixtures(verified.competition, verified.season.year, w72.from, w72.to);
    item.fixtures72 = response72.filter((fixture) => fixture.status === "scheduled" && new Date(fixture.kickoffAt) > new Date(startedAt) && new Date(fixture.kickoffAt) <= new Date(w72.end));
    let future = item.fixtures72;
    if (!future.length) { ensureBudget(); const w168 = windowDates(startedAt, 168), response168 = await provider.fetchCompetitionFixtures(verified.competition, verified.season.year, w168.from, w168.to); item.fixtures168 = response168.filter((fixture) => fixture.status === "scheduled" && new Date(fixture.kickoffAt) > new Date(startedAt) && new Date(fixture.kickoffAt) <= new Date(w168.end)); future = item.fixtures168; }
    if (!future.length) { item.reason = "NO_FUTURE_FIXTURES_168H"; checked.push(item); continue; }
    ensureBudget(); item.teams = await provider.fetchCompetitionTeams(verified.competition, verified.season.year);
    const ids = new Set(item.teams.map((team) => team.providerId)); future = eligibleFutureFixtures(future, verified.competition.providerId, verified.season.year, ids, startedAt, windowDates(startedAt, 168).end);
    if (!future.length) { item.reason = "TEAM_IDENTITY_FAILURE"; checked.push(item); continue; }
    ensureBudget(); item.history = (await provider.fetchSeasonFixtures(verified.competition, verified.season.year)).filter((fixture) => fixture.status === "finished" && fixture.homeScore !== null && fixture.awayScore !== null && new Date(fixture.kickoffAt) < new Date(startedAt));
    item.source = buildInMemoryShadowSource(candidate, verified.competition, verified.season.year, item.teams, item.history, future); item.decision = "SELECTED"; item.reason = "QUALIFIED"; sources.push(item.source); checked.push(item);
  } catch (error) { item.reason = safeProviderErrorDetails(error); checked.push(item); }
}
const repositories = () => ({ predictions: new MemoryShadowPredictionRepository(), runs: new MemoryShadowRunRepository() }), controls = { enabled: true, providerCallsEnabled: false, publicPublishingEnabled: false, globallyPaused: false, horizonHours: 168, maxProviderRequestsPerRun: 0, maxFixtureRefreshAgeMinutes: 180 }, options = { now: startedAt, dryRun: true, persist: false, horizonHours: 168, minimumLeadMinutes: 120 }, allowlist = sources.map((source) => source.supportedCompetition);
const first = await runShadowPredictionPipeline(sources, repositories(), controls, allowlist, options), second = await runShadowPredictionPipeline(sources, repositories(), controls, allowlist, options), reorderedSources = [...sources].reverse().map((source) => ({ ...source, upcomingFixtures: [...source.upcomingFixtures].reverse(), dataset: { ...source.dataset, fixtures: [...source.dataset.fixtures].reverse() } })), third = await runShadowPredictionPipeline(reorderedSources, repositories(), controls, reorderedSources.map((source) => source.supportedCompetition), options);
const canonical = (report) => JSON.stringify({ records: report.records.map((row) => ({ fixtureId: row.fixtureId, p: [row.homeProbability, row.drawProbability, row.awayProbability], outcome: row.selectedOutcome, label: row.confidenceLabel, tier: row.publishingTierCalculated, rank: row.rankingPosition, top: row.isTopPickCalculated })).sort((a, b) => a.fixtureId.localeCompare(b.fixtureId)), skips: report.skips.map((row) => [row.fixtureId, row.reason]).sort() });
const teamNames = new Map(checked.flatMap((item) => item.teams.map((team) => [team.providerId, team.name]))), resultByFixture = new Map(first.records.map((row) => [row.fixtureId, row])), skipByFixture = new Map(first.skips.map((row) => [row.fixtureId, row]));
const proposals = sources.flatMap((source) => source.upcomingFixtures.map((fixture) => { const record = resultByFixture.get(fixture.id), skip = skipByFixture.get(fixture.id), completed = source.dataset.fixtures.filter((row) => row.status === "finished" && row.homeScore !== null && row.awayScore !== null && new Date(row.kickoffAt) < new Date(startedAt)), homeDepth = completed.filter((row) => row.homeTeamId === fixture.homeTeamId || row.awayTeamId === fixture.homeTeamId).length, awayDepth = completed.filter((row) => row.homeTeamId === fixture.awayTeamId || row.awayTeamId === fixture.awayTeamId).length, latestEvidence = completed.map((row) => row.kickoffAt).sort().at(-1) ?? null; return { fixtureId: fixture.id, competition: source.supportedCompetition.name, country: source.supportedCompetition.country, leagueId: source.supportedCompetition.providerCompetitionId, season: source.supportedCompetition.season, home: teamNames.get(fixture.homeTeamId), away: teamNames.get(fixture.awayTeamId), kickoffAt: fixture.kickoffAt, minutesToKickoff: (new Date(fixture.kickoffAt) - new Date(startedAt)) / 60_000, eligible: Boolean(record), reason: skip?.reason ?? null, homeDepth, awayDepth, latestEvidence, prediction: record ? { selectedOutcome: record.selectedOutcome, home: record.homeProbability, draw: record.drawProbability, away: record.awayProbability, confidenceLabel: record.confidenceLabel, publishingTier: record.publishingTierCalculated, rankingDate: record.rankingDate, rank: record.rankingPosition, topPick: record.isTopPickCalculated } : null, persistence: "ZERO_WRITE / NOT_PERSISTED" }; }));
const databaseAfter = { shadowPredictions: await count("football_shadow_predictions"), shadowRuns: await count("football_shadow_runs"), competitions: await count("competitions"), teams: await count("teams"), fixtures: await count("fixtures") };
console.log(JSON.stringify({ startedAt, projectRef, authentication, requestCount: audits.length, audits, checked: checked.map((item) => ({ ...item, source: undefined, historyCount: item.history.length, history: undefined })), selected: sources.map((source) => source.supportedCompetition), first, proposals, deterministic: canonical(first) === canonical(second) && canonical(first) === canonical(third), databaseBefore, databaseAfter }, null, 2));
