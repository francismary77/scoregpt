import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ApiFootballProvider } from "../modules/football-data/api-football-provider.ts";
import { immutablePredictionFingerprint } from "../modules/football-intelligence/shadow-pipeline/index.ts";
import { SupabaseFootballIngestionRepository } from "../modules/persistence/football-repositories.ts";
import { SupabaseShadowPredictionRepository } from "../modules/persistence/shadow-repositories.ts";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : []; }));
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "oislplqdvtaajqxbwvut") throw new Error("DEVELOPMENT_PROJECT_IDENTITY_GATE_FAILED");
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const predictionsRepository = new SupabaseShadowPredictionRepository(client), beforePredictions = await predictionsRepository.list(), beforeFingerprints = new Map(beforePredictions.map((row) => [row.id, immutablePredictionFingerprint(row)]));
const count = async (table, configure = (query) => query) => { const result = await configure(client.from(table).select("*", { count: "exact", head: true })); if (result.error) throw new Error(`${table}: ${result.error.message}`); return result.count ?? 0; };
const before = { teams: await count("teams"), memberships: await count("team_competition_seasons"), completedHistoricalFixtures: await count("fixtures", (query) => query.eq("status", "finished")), shadowRuns: await count("football_shadow_runs"), shadowPredictions: beforePredictions.length };
if (before.completedHistoricalFixtures !== 1990 || before.shadowRuns !== 2 || before.shadowPredictions !== 25) throw new Error("BASELINE_INTEGRITY_GATE_FAILED");

const audits = [], now = new Date().toISOString(), provider = new ApiFootballProvider({ apiKey: env.FOOTBALL_API_KEY, enabled: true, onRequest: (audit) => audits.push(audit) });
const auth = await provider.checkAuthentication();
const competition = { providerId: "140", name: "La Liga", country: "Spain", season: "2026", enabled: false, priority: 940, providerType: "League", seasons: [{ year: "2026", start: null, end: null, current: true, coverage: null }] };
const teams = await provider.fetchCompetitionTeams(competition, "2026");
if (audits.length !== 2 || teams.length === 0) throw new Error("BOUNDED_PROVIDER_REQUEST_GATE_FAILED");
const providerIds = teams.map((team) => team.providerId), uniqueProviderIds = new Set(providerIds);
if (uniqueProviderIds.size !== teams.length || teams.some((team) => !team.providerId || !team.name || team.competitionProviderId !== "140")) throw new Error("PROVIDER_TEAM_PAYLOAD_IDENTITY_FAILURE");
const requiredNames = ["Alaves", "Getafe", "Sevilla", "Rayo Vallecano", "Espanyol", "Levante", "Celta Vigo", "Osasuna"], byName = new Map(teams.map((team) => [team.name, team]));
if (requiredNames.some((name) => !byName.has(name)) || teams.filter((team) => team.name === "Levante").length !== 1) throw new Error("REQUIRED_FIXTURE_TEAM_IDENTITY_AMBIGUITY");

const [competitionResult, existingResult, allTeamsResult] = await Promise.all([
  client.from("competitions").select("id,provider_id,name,country,season").eq("provider", "api-football").eq("provider_id", "140").eq("season", "2026").single(),
  client.from("teams").select("id,provider_id,name").eq("provider", "api-football").in("provider_id", providerIds),
  client.from("teams").select("id,provider,provider_id"),
]);
for (const result of [competitionResult, existingResult, allTeamsResult]) if (result.error) throw new Error(result.error.message);
if (competitionResult.data.name !== "La Liga" || competitionResult.data.country !== "Spain") throw new Error("COMPETITION_IDENTITY_FAILURE");
const canonicalKeys = allTeamsResult.data.map((row) => `${row.provider}:${row.provider_id}`);
if (new Set(canonicalKeys).size !== canonicalKeys.length) throw new Error("PREEXISTING_CANONICAL_TEAM_DUPLICATE");
const existingByProviderId = new Map(existingResult.data.map((row) => [row.provider_id, row])), existingReused = teams.filter((team) => existingByProviderId.has(team.providerId)), missing = teams.filter((team) => !existingByProviderId.has(team.providerId));
const levante = byName.get("Levante");
if (!levante?.providerId || existingResult.data.filter((row) => row.provider_id === levante.providerId).length > 1) throw new Error("LEVANTE_PROVIDER_IDENTITY_FAILURE");

const repository = new SupabaseFootballIngestionRepository(client);
await repository.ingestBundle("api-football", { competition, teams, fixtures: [], snapshots: [], fetchedAt: now, requestCount: audits.length });

const [afterTeamsResult, membershipsResult, allAfterTeamsResult, allFixturesResult, afterPredictions] = await Promise.all([
  client.from("teams").select("id,provider_id,name").eq("provider", "api-football").in("provider_id", providerIds),
  client.from("team_competition_seasons").select("id,team_id,competition_id").eq("competition_id", competitionResult.data.id),
  client.from("teams").select("id,provider,provider_id"),
  client.from("fixtures").select("provider,provider_fixture_id"),
  predictionsRepository.list(),
]);
for (const result of [afterTeamsResult, membershipsResult, allAfterTeamsResult, allFixturesResult]) if (result.error) throw new Error(result.error.message);
const afterByProviderId = new Map(afterTeamsResult.data.map((row) => [row.provider_id, row])), memberIds = new Set(membershipsResult.data.map((row) => row.team_id)), resolution = [
  { fixtureId: "1570333", home: "Alaves", away: "Getafe" },
  { fixtureId: "1570341", home: "Sevilla", away: "Rayo Vallecano" },
  { fixtureId: "1570338", home: "Espanyol", away: "Levante" },
  { fixtureId: "1570336", home: "Celta Vigo", away: "Osasuna" },
].map((fixture) => { const homePayload = byName.get(fixture.home), awayPayload = byName.get(fixture.away), home = afterByProviderId.get(homePayload.providerId), away = afterByProviderId.get(awayPayload.providerId); return { ...fixture, homeProviderTeamId: homePayload.providerId, awayProviderTeamId: awayPayload.providerId, homeCanonicalTeamId: home?.id ?? null, awayCanonicalTeamId: away?.id ?? null, homeMember: Boolean(home && memberIds.has(home.id)), awayMember: Boolean(away && memberIds.has(away.id)), resolved: Boolean(home && away && memberIds.has(home.id) && memberIds.has(away.id)) }; });
const afterKeys = allAfterTeamsResult.data.map((row) => `${row.provider}:${row.provider_id}`), membershipPairs = membershipsResult.data.map((row) => `${row.team_id}:${row.competition_id}`), fixtureKeys = allFixturesResult.data.map((row) => `${row.provider}:${row.provider_fixture_id}`), priorPredictionsUnchanged = beforePredictions.every((row) => afterPredictions.some((item) => item.id === row.id && immutablePredictionFingerprint(item) === beforeFingerprints.get(row.id)));
const after = { teams: await count("teams"), memberships: await count("team_competition_seasons"), completedHistoricalFixtures: await count("fixtures", (query) => query.eq("status", "finished")), shadowRuns: await count("football_shadow_runs"), shadowPredictions: afterPredictions.length };
const integrity = { allPayloadTeamsCanonical: afterTeamsResult.data.length === teams.length, allPayloadTeamsMembers: teams.every((team) => { const row = afterByProviderId.get(team.providerId); return Boolean(row && memberIds.has(row.id)); }), duplicateCanonicalProviderKeys: afterKeys.filter((key, index) => afterKeys.indexOf(key) !== index), duplicateMembershipPairs: membershipPairs.filter((key, index) => membershipPairs.indexOf(key) !== index), duplicateFixtureProviderKeys: fixtureKeys.filter((key, index) => fixtureKeys.indexOf(key) !== index), priorPredictionsUnchanged, allFourResolved: resolution.every((row) => row.resolved) };
if (!integrity.allPayloadTeamsCanonical || !integrity.allPayloadTeamsMembers || integrity.duplicateCanonicalProviderKeys.length || integrity.duplicateMembershipPairs.length || integrity.duplicateFixtureProviderKeys.length || !integrity.priorPredictionsUnchanged || !integrity.allFourResolved || after.completedHistoricalFixtures !== 1990 || after.shadowRuns !== 2 || after.shadowPredictions !== 25) throw new Error("POST_INGESTION_INTEGRITY_FAILURE");
console.log(JSON.stringify({ projectRef, now, providerRequests: audits.length, requestAudit: audits, auth: { accepted: auth.accepted, httpStatus: auth.httpStatus, rateLimitRemaining: auth.rateLimitRemaining }, payload: { teams: teams.length, uniqueProviderIds: uniqueProviderIds.size, levante: { providerTeamId: levante.providerId, name: levante.name }, existingReused: existingReused.length, canonicalCreated: missing.length, missingBefore: missing.map((team) => ({ providerTeamId: team.providerId, name: team.name })) }, membershipRowsUpserted: teams.length, before, after, resolution, integrity, predictionsCreated: 0, publications: 0, notifications: 0 }, null, 2));
