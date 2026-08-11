import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : [];
}));
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "oislplqdvtaajqxbwvut") throw new Error("DEVELOPMENT_PROJECT_IDENTITY_GATE_FAILED");
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const [competitions, teams, fixtures, runs, predictions, memberships] = await Promise.all([
  client.from("competitions").select("id,provider_id,name,country,season").eq("provider", "api-football"),
  client.from("teams").select("id,provider_id,competition_id,name,country,is_demo").eq("provider", "api-football"),
  client.from("fixtures").select("id,provider_fixture_id,competition_id,home_team_id,away_team_id,status").eq("provider", "api-football"),
  client.from("football_shadow_runs").select("id"),
  client.from("football_shadow_predictions").select("id,run_id,provider_fixture_id"),
  client.from("team_competition_seasons").select("team_id,competition_id"),
]);
for (const response of [competitions, teams, fixtures, runs, predictions]) if (response.error) throw new Error(response.error.message);
const competitionById = new Map(competitions.data.map((row) => [row.id, row]));
const laLiga = competitions.data.filter((row) => row.provider_id === "140");
const currentNames = new Set(["Alaves", "Getafe", "Sevilla", "Rayo Vallecano", "Racing Santander", "Villarreal", "Espanyol", "Levante", "Celta Vigo", "Osasuna", "Deportivo La Coruna", "Elche", "Atletico Madrid", "Malaga", "Valencia", "Real Betis", "Real Madrid", "Real Sociedad", "Barcelona", "Athletic Club"]);
const relevantTeams = teams.data.filter((row) => currentNames.has(row.name)).map((row) => ({ providerTeamId: row.provider_id, canonicalTeamId: row.id, name: row.name, attachedCompetition: competitionById.get(row.competition_id) ?? null, isDemo: row.is_demo }));
const laLiga2026 = laLiga.find((row) => row.season === "2026");
const conflicts = relevantTeams.filter((row) => row.attachedCompetition?.id !== laLiga2026?.id);
const duplicateProviderIds = Object.entries(Object.groupBy(teams.data, (row) => row.provider_id)).filter(([, rows]) => rows.length > 1).map(([id]) => id);
const fixtureProviderIds = fixtures.data.map((row) => row.provider_fixture_id).filter(Boolean);
console.log(JSON.stringify({ projectRef, competitions: laLiga, relevantTeams, conflicts, counts: { competitions: competitions.data.length, teams: teams.data.length, fixtures: fixtures.data.length, completedHistoricalFixtures: fixtures.data.filter((row) => row.status === "finished").length, shadowRuns: runs.data.length, shadowPredictions: predictions.data.length, memberships: memberships.error ? null : memberships.data.length }, membershipTable: memberships.error ? { available: false, safeError: memberships.error.message } : { available: true }, integrity: { duplicateCanonicalProviderIds: duplicateProviderIds, duplicateFixtureProviderIds: fixtureProviderIds.filter((id, index) => fixtureProviderIds.indexOf(id) !== index) } }, null, 2));
