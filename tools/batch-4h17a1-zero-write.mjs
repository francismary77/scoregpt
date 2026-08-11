import "tsx/esm";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ApiFootballProvider, safeProviderErrorDetails } from "../modules/football-data/api-football-provider.ts";
import { ACTIVE_LEAGUE_CANDIDATES, verifyCandidateIdentity, windowDates, eligibleFutureFixtures, previousCompletedSeason, buildInMemoryShadowSource } from "../modules/football-intelligence/active-league-zero-write.ts";
import { MemoryShadowPredictionRepository, MemoryShadowRunRepository, runShadowPredictionPipeline } from "../modules/football-intelligence/shadow-pipeline/index.ts";

function loadEnv(path) { const values = {}; for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, ""); } return values; }
const env = loadEnv(".env.local"), required = ["FOOTBALL_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
if (required.some((key) => !env[key])) throw new Error("Required server-side configuration is missing.");
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "oislplqdvtaajqxbwvut") throw new Error("WRONG_SUPABASE_PROJECT — STOPPED BEFORE DATABASE MUTATION");
if (env.FOOTBALL_DATA_PROVIDER !== "api-football" || env.FOOTBALL_DATA_PROVIDER_ENABLED !== "true") throw new Error("API-Football is not explicitly enabled.");
const dailyBudget = Number.parseInt(env.FOOTBALL_API_DAILY_REQUEST_BUDGET || "30", 10);
if (dailyBudget !== 30) throw new Error("Internal daily provider budget must remain 30.");

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const count = async (table) => { const { count: value, error } = await supabase.from(table).select("id", { count: "exact", head: true }); if (error) throw new Error(`Read-only ${table} count failed.`); return value ?? 0; };
const startedAt = new Date().toISOString(), dayStart = `${startedAt.slice(0, 10)}T00:00:00.000Z`;
const { data: requestRows, error: requestError } = await supabase.from("football_provider_requests").select("request_count").eq("provider", "api-football").gte("requested_at", dayStart);
if (requestError) throw new Error("Provider request ledger read failed.");
const auditedBefore = (requestRows ?? []).reduce((sum, row) => sum + row.request_count, 0), shadowBefore = { predictions: await count("football_shadow_predictions"), runs: await count("football_shadow_runs") };
const requestAudit = [];
const provider = new ApiFootballProvider({ apiKey: env.FOOTBALL_API_KEY, enabled: true, now: () => new Date(startedAt), onRequest: (audit) => requestAudit.push({ request: auditedBefore + requestAudit.length + 1, ...audit, retry: false, allowed: true }) });
const checked = []; let selected = null;
for (const candidate of ACTIVE_LEAGUE_CANDIDATES) {
  if (auditedBefore + requestAudit.length >= 20 || requestAudit.length >= 15) break;
  const row = { candidate, identity: null, season: null, fixtures72: [], fixtures168: [], teams: [], decision: "REJECTED", reason: "" };
  try {
    const identities = await provider.discoverCurrentCompetitions(candidate.country), verified = verifyCandidateIdentity(candidate, identities, startedAt);
    if (!verified.ok) { row.reason = verified.reason; checked.push(row); continue; }
    row.identity = verified.competition; row.season = verified.season;
    const first = windowDates(startedAt, 72), fixtures72 = await provider.fetchCompetitionFixtures(verified.competition, verified.season.year, first.from, first.to);
    row.fixtures72 = fixtures72.filter((fixture) => fixture.status === "scheduled" && new Date(fixture.kickoffAt) > new Date(startedAt) && new Date(fixture.kickoffAt) <= new Date(first.end));
    let proposed = row.fixtures72;
    if (!proposed.length) { const extended = windowDates(startedAt, 168), fixtures168 = await provider.fetchCompetitionFixtures(verified.competition, verified.season.year, extended.from, extended.to); row.fixtures168 = fixtures168.filter((fixture) => fixture.status === "scheduled" && new Date(fixture.kickoffAt) > new Date(startedAt) && new Date(fixture.kickoffAt) <= new Date(extended.end)); proposed = row.fixtures168; }
    if (!proposed.length) { row.reason = "NO_GENUINE_FIXTURE_INSIDE_168_HOURS"; checked.push(row); continue; }
    row.teams = await provider.fetchCompetitionTeams(verified.competition, verified.season.year);
    const eligible = eligibleFutureFixtures(proposed, verified.competition.providerId, verified.season.year, new Set(row.teams.map((team) => team.providerId)), startedAt, windowDates(startedAt, 168).end);
    if (!eligible.length) { row.reason = "FIXTURE_OR_TEAM_IDENTITY_GATE_FAILED"; checked.push(row); continue; }
    row.decision = "SELECTED"; row.reason = "FIRST_FULLY_QUALIFIED_ACTIVE_LEAGUE"; selected = { row, fixtures: eligible }; checked.push(row); break;
  } catch (error) { row.reason = safeProviderErrorDetails(error); checked.push(row); }
}

let history = [], historicalSeason = null, existingHistorical = null, report = null;
if (selected) {
  const { data: existingCompetitions, error } = await supabase.from("competitions").select("id,provider_id,name,country,season").eq("provider_id", selected.row.identity.providerId);
  if (error) throw new Error("Existing historical competition lookup failed.");
  existingHistorical = existingCompetitions ?? [];
  const completeMetadata = await provider.getCompetitionMetadata(selected.row.identity.providerId), previous = previousCompletedSeason(completeMetadata, selected.row.season.year, startedAt);
  if (!previous) {
    report = { stop: "HISTORICAL_EVIDENCE_NOT_AVAILABLE_WITHIN_BOUNDED_ACQUISITION" };
  } else {
  historicalSeason = previous.year;
  history = (await provider.fetchSeasonFixtures(selected.row.identity, historicalSeason)).filter((fixture) => fixture.status === "finished" && fixture.homeScore !== null && fixture.awayScore !== null && new Date(fixture.kickoffAt) < new Date(startedAt));
  const source = buildInMemoryShadowSource(selected.row.candidate, selected.row.identity, selected.row.season.year, selected.row.teams, history, selected.fixtures), predictions = new MemoryShadowPredictionRepository(), runs = new MemoryShadowRunRepository();
  const controls = { enabled: true, providerCallsEnabled: false, publicPublishingEnabled: false, globallyPaused: false, horizonHours: 168, maxProviderRequestsPerRun: 0, maxFixtureRefreshAgeMinutes: 180 };
  const options = { now: startedAt, dryRun: true, persist: false, providerRefresh: false, horizonHours: 168 };
  const run = () => runShadowPredictionPipeline([source], { predictions, runs }, controls, [source.supportedCompetition], options);
  const first = await run(), second = await run();
  const reordered = buildInMemoryShadowSource(selected.row.candidate, selected.row.identity, selected.row.season.year, selected.row.teams, [...history].reverse(), [...selected.fixtures].reverse());
  const third = await runShadowPredictionPipeline([reordered], { predictions: new MemoryShadowPredictionRepository(), runs: new MemoryShadowRunRepository() }, controls, [reordered.supportedCompetition], options);
  const canonical = (value) => JSON.stringify({ records: value.records.map((r) => ({ fixtureId: r.fixtureId, probabilities: [r.homeProbability, r.drawProbability, r.awayProbability], selectedOutcome: r.selectedOutcome, confidenceScore: r.confidenceScoreInternal, confidenceLabel: r.confidenceLabel, tier: r.publishingTierCalculated, rank: r.rankingPosition, top: r.isTopPickCalculated })).sort((a, b) => a.fixtureId.localeCompare(b.fixtureId)), skips: value.skips.slice().sort((a, b) => String(a.fixtureId).localeCompare(String(b.fixtureId))) });
  report = { first, deterministic: canonical(first) === canonical(second) && canonical(first) === canonical(third), memoryPredictionRows: (await predictions.list()).length, memoryRunRows: (await runs.list()).length };
  }
}
const shadowAfter = { predictions: await count("football_shadow_predictions"), runs: await count("football_shadow_runs") };
console.log(JSON.stringify({ startedAt, projectRef, auditedBefore, dailyBudget, checked, selected: selected ? { candidate: selected.row.candidate, competition: selected.row.identity, season: selected.row.season, fixtures: selected.fixtures, teams: selected.row.teams } : null, historicalSeason, historyCount: history.length, existingHistorical, report, requestAudit, shadowBefore, shadowAfter }, null, 2));
