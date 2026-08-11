import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ApiFootballProvider } from "../modules/football-data/api-football-provider.ts";
import { immutablePredictionFingerprint, SHADOW_VERSIONS } from "../modules/football-intelligence/shadow-pipeline/index.ts";
import { SupabaseShadowPredictionRepository, SupabaseShadowRunRepository } from "../modules/persistence/shadow-repositories.ts";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : []; }));
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "oislplqdvtaajqxbwvut") throw new Error("DEVELOPMENT_PROJECT_IDENTITY_GATE_FAILED");
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }), predictionsRepository = new SupabaseShadowPredictionRepository(client), runsRepository = new SupabaseShadowRunRepository(client);
const beforePredictions = await predictionsRepository.list(), beforeRuns = await runsRepository.list(), beforeFingerprints = new Map(beforePredictions.map((row) => [row.id, immutablePredictionFingerprint(row)]));
if (beforePredictions.length !== 29 || beforeRuns.length !== 3 || beforePredictions.some((row) => row.operationalPublicationState !== "SHADOW_ONLY" || row.settlementStatus !== "PENDING" || row.methodologyVersion !== SHADOW_VERSIONS.methodologyVersion || row.confidenceVersion !== SHADOW_VERSIONS.confidenceVersion || row.publishingPolicyVersion !== SHADOW_VERSIONS.publishingPolicyVersion)) throw new Error("FROZEN_BASELINE_INTEGRITY_FAILURE");
const completed = await client.from("fixtures").select("*", { count: "exact", head: true }).eq("status", "finished");
if (completed.error || completed.count !== 1990) throw new Error("HISTORICAL_BASELINE_INTEGRITY_FAILURE");

const now = new Date().toISOString(), audits = [], provider = new ApiFootballProvider({ apiKey: env.FOOTBALL_API_KEY, enabled: true, now: () => new Date(now), onRequest: (audit) => audits.push(audit) }), auth = await provider.checkAuthentication();
const configs = [
  { key: "PREMIER_LEAGUE", id: "39", name: "Premier League", country: "England" },
  { key: "LIGUE1", id: "61", name: "Ligue 1", country: "France" },
  { key: "SERIEA", id: "135", name: "Serie A", country: "Italy" },
], leagues = [];
for (const config of configs) {
  const metadata = await provider.getCompetitionMetadata(config.id);
  if (metadata.name !== config.name || metadata.country !== config.country) throw new Error(`COMPETITION_IDENTITY_FAILURE_${config.id}`);
  const season = metadata.seasons.find((item) => item.year === "2026" && item.current);
  if (!season) throw new Error(`CURRENT_SEASON_IDENTITY_FAILURE_${config.id}`);
  const teams = await provider.fetchCompetitionTeams(metadata, "2026"), fixtures = await provider.fetchSeasonFixtures(metadata, "2026"), providerIds = teams.map((team) => team.providerId);
  if (!teams.length || new Set(providerIds).size !== teams.length || teams.some((team) => !team.providerId || !team.name || team.competitionProviderId !== config.id)) throw new Error(`TEAM_PAYLOAD_IDENTITY_FAILURE_${config.id}`);
  const future = fixtures.filter((fixture) => new Date(fixture.kickoffAt) > new Date(now)).sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)), openingRound = future[0]?.round ?? null, opening = openingRound ? future.filter((fixture) => fixture.round === openingRound) : [], names = new Map(teams.map((team) => [team.providerId, team.name])), inspected = opening.map((fixture) => { const hours = (new Date(fixture.kickoffAt).getTime() - new Date(now).getTime()) / 3_600_000, entryAt = new Date(new Date(fixture.kickoffAt).getTime() - 168 * 3_600_000).toISOString(), alreadyFrozen = beforePredictions.some((row) => row.providerFixtureId === fixture.providerId); let reason = "ELIGIBLE_FOR_EVIDENCE_CHECK"; if (alreadyFrozen) reason = "DUPLICATE_ALREADY_FROZEN"; else if (fixture.status !== "scheduled") reason = fixture.status === "finished" ? "COMPLETED" : fixture.status.toUpperCase(); else if (hours < 2) reason = hours <= 0 ? "ALREADY_STARTED" : "UNDER_120_MINUTES"; else if (hours > 168) reason = "OUTSIDE_168H_WINDOW"; return { fixtureId: fixture.providerId, homeTeamId: fixture.homeTeamProviderId, home: names.get(fixture.homeTeamProviderId), awayTeamId: fixture.awayTeamProviderId, away: names.get(fixture.awayTeamProviderId), kickoffUtc: fixture.kickoffAt, status: fixture.status, hoursUntilKickoff: hours, entryAt, reason }; });
  const inside = inspected.filter((fixture) => fixture.hoursUntilKickoff >= 2 && fixture.hoursUntilKickoff <= 168 && fixture.status === "scheduled" && fixture.reason !== "DUPLICATE_ALREADY_FROZEN");
  leagues.push({ ...config, providerName: metadata.name, providerCountry: metadata.country, season: season.year, seasonCurrent: season.current, seasonStart: season.start, seasonEnd: season.end, teamCount: teams.length, fixtureCount: fixtures.length, openingRound, inspected, inside168h: inside.length, earliestEntryAt: inspected.map((fixture) => fixture.entryAt).sort()[0] ?? null, status: inside.length ? "REQUIRES_EVIDENCE_STAGE" : "WAITING_FOR_WINDOW" });
}
if (audits.length !== 10) throw new Error("PROVIDER_REQUEST_BOUNDARY_FAILURE");
const afterPredictions = await predictionsRepository.list(), afterRuns = await runsRepository.list(), unchanged = afterPredictions.length === 29 && afterRuns.length === 3 && beforePredictions.every((row) => afterPredictions.some((item) => item.id === row.id && immutablePredictionFingerprint(item) === beforeFingerprints.get(row.id)));
if (!unchanged) throw new Error("FROZEN_PREDICTION_MUTATION");
console.log(JSON.stringify({ projectRef, now, auth: { httpStatus: auth.httpStatus }, preRun: { shadowRuns: beforeRuns.length, shadowPredictions: beforePredictions.length, pending: beforePredictions.filter((row) => row.settlementStatus === "PENDING").length, settled: beforePredictions.filter((row) => row.settlementStatus === "SETTLED").length, fingerprints: beforeFingerprints.size, completedHistoricalFixtures: completed.count }, requests: { total: audits.length, retries: 0, byEndpoint: Object.fromEntries(Object.entries(Object.groupBy(audits, (audit) => audit.path)).map(([key, rows]) => [key, rows.length])), audit: audits, finalRemaining: audits.at(-1)?.rateLimitRemaining, predictions: 0, odds: 0, standings: 0, statistics: 0, injuries: 0, openAI: 0 }, leagues, postRun: { shadowRuns: afterRuns.length, shadowPredictions: afterPredictions.length, previousFingerprintsUnchanged: unchanged, databaseWrites: 0, publications: 0, notifications: 0 }, nextExecutionAt: leagues.map((league) => league.earliestEntryAt).filter(Boolean).sort()[0] ?? null }, null, 2));
