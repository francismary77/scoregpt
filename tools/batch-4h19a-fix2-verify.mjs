import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { immutablePredictionFingerprint } from "../modules/football-intelligence/shadow-pipeline/index.ts";
import { SupabaseShadowPredictionRepository } from "../modules/persistence/shadow-repositories.ts";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : []; }));
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "oislplqdvtaajqxbwvut") throw new Error("DEVELOPMENT_PROJECT_IDENTITY_GATE_FAILED");
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const count = async (table, configure = (query) => query) => { const result = await configure(client.from(table).select("*", { count: "exact", head: true })); if (result.error) throw new Error(`${table}: ${result.error.message}`); return result.count ?? 0; };
const [competitionResult, teamsResult, membershipsResult, fixturesResult, predictions] = await Promise.all([
  client.from("competitions").select("id,provider_id,name,country,season").eq("provider", "api-football").eq("provider_id", "140").eq("season", "2026").single(),
  client.from("teams").select("id,provider,provider_id,name,competition_id,is_demo"),
  client.from("team_competition_seasons").select("id,team_id,competition_id"),
  client.from("fixtures").select("id,provider,provider_fixture_id,status,home_team_id,away_team_id,competition_id"),
  new SupabaseShadowPredictionRepository(client).list(),
]);
for (const result of [competitionResult, teamsResult, membershipsResult, fixturesResult]) if (result.error) throw new Error(result.error.message);
const teams = teamsResult.data, memberships = membershipsResult.data, fixtures = fixturesResult.data, competition = competitionResult.data, byName = new Map(teams.filter((row) => row.provider === "api-football").map((row) => [row.name, row])), membershipKeys = new Set(memberships.map((row) => `${row.team_id}:${row.competition_id}`));
const requested = [
  { fixtureId: "1570333", home: "Alaves", away: "Getafe" },
  { fixtureId: "1570341", home: "Sevilla", away: "Rayo Vallecano" },
  { fixtureId: "1570338", home: "Espanyol", away: "Levante" },
  { fixtureId: "1570336", home: "Celta Vigo", away: "Osasuna" },
];
const resolution = requested.map((fixture) => { const home = byName.get(fixture.home), away = byName.get(fixture.away), homeMember = Boolean(home && membershipKeys.has(`${home.id}:${competition.id}`)), awayMember = Boolean(away && membershipKeys.has(`${away.id}:${competition.id}`)); return { ...fixture, homeCanonicalTeamId: home?.id ?? null, homeProviderTeamId: home?.provider_id ?? null, awayCanonicalTeamId: away?.id ?? null, awayProviderTeamId: away?.provider_id ?? null, homeMembership2026: homeMember, awayMembership2026: awayMember, resolved: Boolean(home && away && homeMember && awayMember) }; });
const canonicalKeys = teams.map((row) => `${row.provider}:${row.provider_id}`), membershipPairs = memberships.map((row) => `${row.team_id}:${row.competition_id}`), backfillMissing = teams.filter((row) => row.competition_id && !membershipKeys.has(`${row.id}:${row.competition_id}`));
const runs = Object.groupBy(predictions, (row) => row.runId), fingerprints = predictions.map((row) => immutablePredictionFingerprint(row));
console.log(JSON.stringify({ projectRef, schema: { membershipTableExists: true, columnsPresent: memberships.length ? Object.keys(memberships[0]).sort() : [], membershipRows: memberships.length, duplicateMembershipPairs: membershipPairs.filter((key, index) => membershipPairs.indexOf(key) !== index), backfillMissing: backfillMissing.map((row) => row.id) }, counts: { teams: await count("teams"), fixtures: await count("fixtures"), completedHistoricalFixtures: await count("fixtures", (query) => query.eq("status", "finished")), shadowRuns: await count("football_shadow_runs"), shadowPredictions: predictions.length, cohort1: runs.shadowrun_20260810T194650130Z?.length ?? 0, cohort2: runs.shadowrun_20260810T221803419Z?.length ?? 0 }, identity: { duplicateCanonicalProviderKeys: canonicalKeys.filter((key, index) => canonicalKeys.indexOf(key) !== index), duplicateFixtureProviderKeys: fixtures.map((row) => `${row.provider}:${row.provider_fixture_id}`).filter((key, index, all) => all.indexOf(key) !== index) }, predictions: { uniqueFingerprints: new Set(fingerprints).size, invalid: predictions.filter((row) => row.operationalPublicationState !== "SHADOW_ONLY" || row.settlementStatus !== "PENDING" || Math.abs(row.homeProbability + row.drawProbability + row.awayProbability - 1) > .001).map((row) => row.id) }, laLiga2026: competition, resolution, allFourResolved: resolution.every((row) => row.resolved), providerRequests: 0, writes: 0 }, null, 2));
