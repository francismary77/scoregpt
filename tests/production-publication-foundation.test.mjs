import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migrationPath = "supabase/migrations/202608110003_production_prediction_publication_foundation.sql";

test("persisted entitlement uses canonical internal fixture UUIDs end to end", async () => {
  const [repository, fixturePage, action] = await Promise.all([
    read("modules/persistence/repositories.ts"),
    read("app/matches/[fixtureId]/page.tsx"),
    read("app/matches/[fixtureId]/actions.ts"),
  ]);
  assert.match(repository, /const viewedFixtureIds = \[\.\.\.new Set\(\(data \?\? \[\]\)\.flatMap\(\(row\) => row\.fixture_id/);
  assert.doesNotMatch(repository, /labels\.get\(id\)/);
  assert.doesNotMatch(repository, /provider_fixture_id\)\.in\("id", ids\)/);
  assert.match(fixturePage, /usage\.viewedFixtureIds\.includes\(fixture\.id\)/);
  assert.match(action, /unlockPrediction\(user\.id, fixtureId\)/);
});

test("database owns the lifetime allowance and callers cannot raise it", async () => {
  const [migration, repository, types] = await Promise.all([read(migrationPath), read("modules/persistence/repositories.ts"), read("lib/supabase/database.types.ts")]);
  assert.match(migration, /v_allowance constant integer := 3/);
  assert.match(migration, /create or replace function public\.unlock_consumer_prediction\(p_fixture_id uuid\)/);
  assert.doesNotMatch(migration, /p_allowance/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /count\(distinct fixture_id\)/);
  assert.match(migration, /if v_used >= v_allowance/);
  assert.match(repository, /rpc\("unlock_consumer_prediction", \{ p_fixture_id: persistedFixtureId \}\)/);
  assert.doesNotMatch(repository, /p_allowance/);
  assert.doesNotMatch(types, /p_allowance/);
});

test("publication bridge is service-role-only, atomic, identity-bound and pre-kickoff", async () => {
  const [migration, service] = await Promise.all([read(migrationPath), read("modules/consumer-publication/service.ts")]);
  assert.match(migration, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/);
  assert.match(migration, /v_fixture\.provider_fixture_id is distinct from v_shadow\.provider_fixture_id/);
  assert.match(migration, /v_competition\.provider_id is distinct from v_shadow\.provider_competition_id/);
  assert.match(migration, /v_fixture\.home_team_id <> v_shadow\.home_team_id/);
  assert.match(migration, /v_fixture\.is_demo or v_competition\.is_demo or v_home\.is_demo or v_away\.is_demo/);
  assert.match(migration, /if now\(\) >= v_shadow\.kickoff_at/);
  assert.match(migration, /forward_prediction_id = v_shadow\.id/);
  assert.match(migration, /insert into public\.intelligence_reports/);
  assert.match(migration, /insert into public\.prediction_markets/);
  assert.match(migration, /revoke all on function public\.prepare_consumer_prediction[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.prepare_consumer_prediction[\s\S]*to service_role/);
  assert.match(service, /import "@\/lib\/server-only"/);
  assert.match(service, /prepare_consumer_prediction/);
});

test("publication requires review and rejects direct invalid transitions", async () => {
  const migration = await read(migrationPath);
  assert.match(migration, /NOT_PUBLISHED' and p_target_state = 'READY_FOR_REVIEW'/);
  assert.match(migration, /READY_FOR_REVIEW' and p_target_state in \('NOT_PUBLISHED','PUBLISHED'\)/);
  assert.match(migration, /PUBLISHED' and p_target_state = 'WITHDRAWN'/);
  assert.match(migration, /WITHDRAWN' and p_target_state = 'READY_FOR_REVIEW'/);
  assert.match(migration, /message = 'invalid_publication_transition'/);
  assert.match(migration, /consumer_publication_state = p_target_state/);
  assert.match(migration, /status = case p_target_state when 'PUBLISHED' then 'published'/);
});

test("frozen shadow output is mapped without invented fixture analysis", async () => {
  const [migration, renderer, fallback, parserModule] = await Promise.all([
    read(migrationPath),
    read("components/stored-intelligence-report.tsx"),
    read("modules/football-experience/fallback.ts"),
    import("../modules/football-experience/report-content.ts"),
  ]);
  for (const key of ["selectedOutcome", "probabilities", "confidence", "publication", "methodology", "evidence", "forwardPredictionId"]) assert.match(migration, new RegExp(`'${key}'`));
  assert.match(renderer, /report\.forwardPrediction \? frozen/);
  assert.match(renderer, /Frozen model output/);
  assert.match(renderer, /1X2 probabilities/);
  assert.match(renderer, /Evidence provenance/);
  assert.match(renderer, /No generic fixture analysis is substituted/);
  assert.match(fallback, /confidenceExplanation: report\.confidenceExplanation/);
  assert.match(fallback, /riskExplanation: report\.riskIntelligence\.explanation/);
  const [forwardBranch, demoBranch = ""] = renderer.split(' : <>\n      <h4>Why this prediction?</h4>');
  assert.doesNotMatch(forwardBranch, /<h4>Confidence explanation<\/h4>/);
  assert.doesNotMatch(forwardBranch, /<h4>Risk explanation<\/h4>/);
  assert.doesNotMatch(forwardBranch, /Team comparison|Tactical outlook|Expected match flow|Markets to avoid/);
  assert.match(demoBranch, /report\.confidenceExplanation/);
  assert.match(demoBranch, /report\.riskExplanation/);
  assert.match(renderer, /!report\.forwardPrediction && <><h4>Markets to avoid/);
  const parsed = parserModule.parseFrozenForwardReportContent({ kind: "frozen-forward-prediction-v1", selectedOutcome: "home", probabilities: { home: .5, draw: .3, away: .2 }, confidence: { label: "MODERATE" }, publication: { tier: "STANDARD_ANALYSIS" }, methodology: { version: "historical-v1" }, evidence: { cutoffAt: "2026-08-11T08:00:00Z" } });
  assert.deepEqual(parsed?.probabilities, { home: .5, draw: .3, away: .2 });
  assert.equal(parserModule.parseFrozenForwardReportContent({ kind: "frozen-forward-prediction-v1", selectedOutcome: "home", probabilities: { home: .9, draw: .9, away: .9 } }), null);
});
