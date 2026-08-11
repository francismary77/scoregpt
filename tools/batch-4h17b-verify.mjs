import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : [];
  }),
);
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "oislplqdvtaajqxbwvut") throw new Error("Development identity gate failed.");

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const runId = "shadowrun_20260810T194650130Z";
const cohortFixtureIds = ["1523235", "1523236", "1523237", "1495757", "1494738", "1494244", "1494248", "1495761", "1494739", "1494246"];
const [runs, predictions, competitions, teams, fixtures, finishedFixtures, anonRead] = await Promise.all([
  admin.from("football_shadow_runs").select("*").eq("id", runId),
  admin.from("football_shadow_predictions").select("*").eq("run_id", runId).order("kickoff_at"),
  admin.from("competitions").select("id,provider_id,name,country,season,enabled,is_demo").eq("provider", "api-football"),
  admin.from("teams").select("id,provider_id,name,is_demo").eq("provider", "api-football"),
  admin.from("fixtures").select("id,provider_fixture_id,status,is_demo,provider,competition_id").eq("provider", "api-football").in("provider_fixture_id", cohortFixtureIds),
  admin.from("fixtures").select("id", { count: "exact", head: true }).eq("status", "finished"),
  anon.from("football_shadow_predictions").select("id", { count: "exact", head: true }),
]);
for (const result of [runs, predictions, competitions, teams, fixtures, finishedFixtures]) {
  if (result.error) throw result.error;
}
const rows = predictions.data;
const duplicateKeys = Object.entries(
  Object.groupBy(rows, (row) => `${row.fixture_id}|${row.methodology_version}|${row.publishing_policy_version}|${row.shadow_mode}`),
).filter(([, grouped]) => grouped.length > 1);
const invalid = rows.filter((row) => {
  const total = row.home_probability + row.draw_probability + row.away_probability;
  return row.shadow_mode !== true || row.operational_publication_state !== "SHADOW_ONLY" || row.settlement_status !== "PENDING" || row.actual_home_goals !== null || row.actual_away_goals !== null || row.actual_outcome !== null || row.prediction_correct !== null || row.settled_at !== null || new Date(row.kickoff_at) - new Date(row.prediction_created_at) < 120 * 60_000 || new Date(row.evidence_cutoff_at) >= new Date(row.prediction_created_at) || Math.abs(total - 1) > 0.0002;
});
console.log(JSON.stringify({
  projectRef,
  counts: { runs: runs.data.length, predictions: rows.length, competitions: competitions.data.length, teams: teams.data.length, fixtures: fixtures.data.length, finishedFixtures: finishedFixtures.count },
  run: runs.data[0],
  predictionIds: rows.map((row) => row.id),
  competitionIds: [...new Set(rows.map((row) => row.provider_competition_id))].sort(),
  fixtureIds: rows.map((row) => row.provider_fixture_id),
  duplicateCanonicalKeys: duplicateKeys.length,
  invalidRows: invalid.length,
  allFixturesResolved: rows.every((row) => fixtures.data.some((fixture) => fixture.id === row.fixture_id && fixture.provider_fixture_id === row.provider_fixture_id)),
  allTeamsResolved: rows.every((row) => teams.data.some((team) => team.id === row.home_team_id) && teams.data.some((team) => team.id === row.away_team_id)),
  allCompetitionsResolved: rows.every((row) => competitions.data.some((competition) => competition.id === row.competition_id && competition.provider_id === row.provider_competition_id && competition.enabled === false)),
  anonymousRead: { denied: Boolean(anonRead.error), status: anonRead.status, count: anonRead.count },
}, null, 2));
