import "tsx/esm";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ApiFootballProvider, safeProviderErrorDetails } from "../modules/football-data/api-football-provider.ts";
import { SupabaseProviderRequestRepository } from "../modules/persistence/football-repositories.ts";
import { SupabaseShadowPredictionRepository } from "../modules/persistence/shadow-repositories.ts";

const expectedProject = "oislplqdvtaajqxbwvut", providerName = "api-football", leagueId = "179", currentSeason = "2026", historicalSeason = "2024", requestBudget = 1;
const target = { fixtureId: "1556642", kickoffAt: "2026-08-22T14:00:00.000Z", homeProviderId: "249", awayProviderId: "250", homeName: "Hibernian", awayName: "Kilmarnock" };
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : []; }));
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FOOTBALL_API_KEY"]) if (!env[key]) throw new Error(`Missing required server-only variable: ${key}`);
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== expectedProject) throw new Error("DEVELOPMENT_PROJECT_IDENTITY_GATE_FAILED");
if (env.FOOTBALL_DATA_PROVIDER !== "api-football" || env.FOOTBALL_DATA_PROVIDER_ENABLED !== "true") throw new Error("CONTROLLED_PROVIDER_NOT_ENABLED");
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const requests = new SupabaseProviderRequestRepository(client), predictions = new SupabaseShadowPredictionRepository(client);
const now = new Date(), nowIso = now.toISOString(), dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString(), configuredBudget = Number.parseInt(env.FOOTBALL_API_DAILY_REQUEST_BUDGET || "30", 10);
const quotaBefore = await requests.getQuotaStatus(providerName, dayStart, configuredBudget);
const historicalCompetition = await client.from("competitions").select("id,name,country,season").eq("provider", providerName).eq("provider_id", leagueId).eq("season", historicalSeason).single();
if (historicalCompetition.error) throw new Error("PERSISTED_SCOTTISH_2024_HISTORY_NOT_FOUND");
const historicalRows = await client.from("fixtures").select("id,provider_fixture_id,kickoff_at,status,home_team_id,away_team_id,home_score,away_score,is_demo").eq("competition_id", historicalCompetition.data.id).eq("provider", providerName).eq("status", "finished").lt("kickoff_at", nowIso).order("kickoff_at");
if (historicalRows.error) throw new Error("HISTORICAL_FIXTURE_READ_FAILED");
const historicalFixtures = historicalRows.data ?? [], historicalTeamIds = [...new Set(historicalFixtures.flatMap((fixture) => [fixture.home_team_id, fixture.away_team_id]))];
const historicalTeamsResult = await client.from("teams").select("id,provider_id,name,is_demo").in("id", historicalTeamIds).eq("provider", providerName);
if (historicalTeamsResult.error) throw new Error("HISTORICAL_TEAM_READ_FAILED");
const historicalTeams = historicalTeamsResult.data ?? [], byProviderId = new Map(historicalTeams.flatMap((team) => team.provider_id ? [[team.provider_id, team]] : [])), evidenceCounts = new Map();
for (const fixture of historicalFixtures) for (const teamId of [fixture.home_team_id, fixture.away_team_id]) evidenceCounts.set(teamId, (evidenceCounts.get(teamId) ?? 0) + 1);
const preflight = { projectRef, provider: providerName, proposedRequestBudget: requestBudget, quotaBefore, historicalCompetition: historicalCompetition.data, historicalFixtureCount: historicalFixtures.length, historicalTeamCount: historicalTeams.length, demoHistoricalRows: historicalFixtures.filter((row) => row.is_demo).length + historicalTeams.filter((row) => row.is_demo).length, providerCallsMade: 0 };
if (process.argv.includes("--preflight")) { console.log(JSON.stringify(preflight, null, 2)); process.exit(0); }
if (!process.argv.includes("--execute")) throw new Error("Use --preflight or --execute explicitly.");
if (quotaBefore.remainingBudget < requestBudget) throw new Error("INTERNAL_DAILY_PROVIDER_BUDGET_INSUFFICIENT");
const approvedKickoff = new Date(target.kickoffAt).getTime(), horizonEnd = now.getTime() + 168 * 3_600_000;
if (approvedKickoff <= now.getTime() || approvedKickoff > horizonEnd) throw new Error("TARGET_OUTSIDE_168_HOUR_HORIZON");

const audits = [], competition = { providerId: leagueId, name: "Premiership", country: "Scotland", type: "League", seasons: [{ year: currentSeason, start: "2026-07-31", end: "2027-04-10", current: true }] };
const provider = new ApiFootballProvider({ apiKey: env.FOOTBALL_API_KEY, enabled: true, now: () => now, onRequest: (audit) => audits.push({ sequence: audits.length + 1, ...audit }) });
let returnedFixtures;
try {
  const payload = await provider.fetchFixtureData(target.fixtureId, []);
  returnedFixtures = [payload.fixture];
  if (audits.length !== requestBudget) throw new Error("PROVIDER_REQUEST_COUNT_MISMATCH");
  const fixture = payload.fixture;
  if (fixture.providerId !== target.fixtureId || fixture.competitionProviderId !== leagueId || fixture.homeTeamProviderId !== target.homeProviderId || fixture.awayTeamProviderId !== target.awayProviderId || fixture.kickoffAt !== target.kickoffAt || fixture.status !== "scheduled") throw new Error("APPROVED_FIXTURE_IDENTITY_MISMATCH");
  await requests.recordRequest({ provider: providerName, category: "fixture", endpoint: `controlled-target:${target.fixtureId}`, requestedAt: nowIso, requestCount: audits.length, succeeded: true, cacheState: "missing", refreshReason: "manual", errorCode: null });
} catch (error) {
  const safe = safeProviderErrorDetails(error), consumed = typeof error === "object" && error && "requestCount" in error && typeof error.requestCount === "number" ? error.requestCount : Math.max(1, audits.length);
  await requests.recordRequest({ provider: providerName, category: "fixture", endpoint: `controlled-target:${target.fixtureId}`, requestedAt: nowIso, requestCount: consumed, succeeded: false, cacheState: "missing", refreshReason: "manual", errorCode: safe.code });
  console.error(JSON.stringify({ success: false, projectRef, providerRequests: consumed, safeProviderError: safe, audits }, null, 2));
  process.exit(1);
}

const existingShadows = await predictions.list(), frozenProviderIds = new Set(existingShadows.map((row) => row.providerFixtureId));
const teamNames = new Map([[target.homeProviderId, target.homeName], [target.awayProviderId, target.awayName]]);
const fixtureEligibility = returnedFixtures.map((fixture) => {
  const home = byProviderId.get(fixture.homeTeamProviderId), away = byProviderId.get(fixture.awayTeamProviderId), homeHistoricalMatchCount = home ? evidenceCounts.get(home.id) ?? 0 : 0, awayHistoricalMatchCount = away ? evidenceCounts.get(away.id) ?? 0 : 0, kickoff = new Date(fixture.kickoffAt).getTime();
  const kickoffIsFuture = kickoff > now.getTime(), insidePredictionHorizon = kickoff <= horizonEnd, scheduledStatusPass = fixture.status === "scheduled", homeIdentityFound = Boolean(home), awayIdentityFound = Boolean(away), homeHistoryPass = homeHistoricalMatchCount >= 5, awayHistoryPass = awayHistoricalMatchCount >= 5, alreadyFrozen = frozenProviderIds.has(fixture.providerId), rejectionCodes = [];
  if (!kickoffIsFuture) rejectionCodes.push("KICKOFF_NOT_FUTURE");
  if (!insidePredictionHorizon) rejectionCodes.push("OUTSIDE_168_HOUR_HORIZON");
  if (!scheduledStatusPass) rejectionCodes.push("FIXTURE_STATUS_INELIGIBLE");
  if (!homeIdentityFound) rejectionCodes.push("HOME_IDENTITY_NOT_FOUND");
  if (!awayIdentityFound) rejectionCodes.push("AWAY_IDENTITY_NOT_FOUND");
  if (homeIdentityFound && !homeHistoryPass) rejectionCodes.push("HOME_INSUFFICIENT_HISTORY");
  if (awayIdentityFound && !awayHistoryPass) rejectionCodes.push("AWAY_INSUFFICIENT_HISTORY");
  if (alreadyFrozen) rejectionCodes.push("ALREADY_FROZEN");
  return { fixtureId: fixture.providerId, kickoff: fixture.kickoffAt, timezone: "UTC", status: fixture.status, kickoffIsFuture, insidePredictionHorizon, scheduledStatusPass, homeProviderId: fixture.homeTeamProviderId, homeName: teamNames.get(fixture.homeTeamProviderId) ?? null, homeCanonicalUuid: home?.id ?? null, homeIdentityFound, homeHistoricalMatchCount, homeHistoryPass, awayProviderId: fixture.awayTeamProviderId, awayName: teamNames.get(fixture.awayTeamProviderId) ?? null, awayCanonicalUuid: away?.id ?? null, awayIdentityFound, awayHistoricalMatchCount, awayHistoryPass, alreadyFrozen, overallEligible: rejectionCodes.length === 0, rejectionCodes };
});
const rejectionCounts = Object.fromEntries(["NO_FIXTURES_RETURNED", "KICKOFF_NOT_FUTURE", "OUTSIDE_168_HOUR_HORIZON", "FIXTURE_STATUS_INELIGIBLE", "HOME_IDENTITY_NOT_FOUND", "AWAY_IDENTITY_NOT_FOUND", "HOME_INSUFFICIENT_HISTORY", "AWAY_INSUFFICIENT_HISTORY", "ALREADY_FROZEN"].map((code) => [code, code === "NO_FIXTURES_RETURNED" ? (fixtureEligibility.length ? 0 : 1) : fixtureEligibility.filter((fixture) => fixture.rejectionCodes.includes(code)).length]));
const eligibleCandidate = fixtureEligibility.filter((fixture) => fixture.overallEligible).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0] ?? null;
const quotaAfter = await requests.getQuotaStatus(providerName, dayStart, configuredBudget);
console.log(JSON.stringify({ success: true, controlledTargetOnly: true, projectRef, startedAt: nowIso, target, provider: { name: providerName, requestsMade: audits.length, endpoints: audits.map((audit) => ({ requestNumber: audit.sequence, path: audit.path, parameters: audit.parameters, success: audit.httpStatus >= 200 && audit.httpStatus < 300, httpStatus: audit.httpStatus, recordsReturned: audit.recordsReturned, rateLimitRemaining: audit.rateLimitRemaining })), quotaBefore, quotaAfter }, fixtures: { count: fixtureEligibility.length, rows: fixtureEligibility }, eligibleCandidate, rejectionCounts, writes: { providerAuditRows: 1, canonicalRecords: 0, memberships: 0, fixtures: 0, historicalFixtures: 0, shadowRuns: 0, shadowPredictions: 0, consumerReports: 0, markets: 0, usage: 0, entitlements: 0, publications: 0, allowancesConsumed: 0 } }, null, 2));
