import "tsx/esm";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const {footballDate}=await import("../modules/football-experience/match-view.ts");
const {normalizeMatchStatus}=await import("../modules/football-data/normalization.ts");

test("Lagos football date crosses midnight independently of UTC",()=>{
  assert.equal(footballDate("2026-08-21T22:30:00Z"),"2026-08-21");
  assert.equal(footballDate("2026-08-21T23:30:00Z"),"2026-08-22");
});

test("provider terminal states retain safe lifecycle meaning",()=>{
  assert.equal(normalizeMatchStatus("FT"),"finished");
  assert.equal(normalizeMatchStatus("ABD"),"abandoned");
  assert.equal(normalizeMatchStatus("AWD"),"void");
  assert.equal(normalizeMatchStatus("WO"),"void");
});

test("settlement refreshes fixture identities only and fails closed",async()=>{
  const source=await read("modules/football-orchestration/service.ts");
  assert.match(source,/fetchFixtureData\(fixture\.provider_fixture_id,\[\]\)/);
  assert.match(source,/maxProviderRequestsPerRun/);
  assert.match(source,/dailyRequestBudget-used/);
  assert.match(source,/upsertFixture\(provider\.name,fresh\.fixture/);
  assert.match(source,/if\(refreshFailed\)continue/);
  assert.doesNotMatch(source,/fetchCompetitionData[^\n]+settle/);
});

test("Match Centre uses Lagos dates and future-only Upcoming",async()=>{
  const source=await read("components/match-browser.tsx");
  assert.match(source,/footballDate\(item\.kickoffAt\)===today/);
  assert.match(source,/new Date\(item\.kickoffAt\)\.getTime\(\)>now/);
  assert.match(source,/scrollIntoView/);
});

test("Match Centre Results alone sorts newest completed fixtures first",async()=>{const source=await read("components/match-browser.tsx");assert.match(source,/view==="results"\?\[\.\.\.filtered\]\.sort\(\(a,b\)=>new Date\(b\.kickoffAt\)\.getTime\(\)-new Date\(a\.kickoffAt\)\.getTime\(\)\):filtered/)});

test("Results exposes only post-kickoff published frozen 1X2 predictions",async()=>{
  const [sql,repository,service,page]=await Promise.all([
    read("supabase/migrations/202608210001_p8b19_match_lifecycle_results.sql"),
    read("modules/football-experience/repository.ts"),
    read("modules/football-experience/service.ts"),
    read("app/results/page.tsx"),
  ]);
  assert.match(sql,/consumer_publication_state='PUBLISHED'/);
  assert.match(sql,/f\.kickoff_at<=now\(\)/);
  assert.match(sql,/prediction_market='MATCH_OUTCOME_1X2'/);
  assert.doesNotMatch(sql,/grant select on public\.football_shadow_predictions/i);
  assert.match(repository,/list_published_prediction_results/);
  assert.match(service,/rows\.predictionResults/);
  assert.match(page,/Predictions vs Actual Results/);
});
