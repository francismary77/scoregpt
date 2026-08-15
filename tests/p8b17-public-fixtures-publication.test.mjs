import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public fixtures are loaded independently of the prediction catalog", async () => {
  const [repository, service] = await Promise.all([
    read("modules/football-experience/repository.ts"),
    read("modules/football-experience/service.ts"),
  ]);
  assert.match(repository, /\.in\("competition_id", competitionIds\)/);
  assert.doesNotMatch(repository, /from\("fixtures"\)[\s\S]{0,100}\.in\("id", fixtureIds\)/);
  assert.doesNotMatch(service, /catalogFixtureIds\.has/);
});

test("public publication selects only future pending TOP_20 predictions", async () => {
  const source = await read("modules/football-orchestration/service.ts");
  assert.match(source, /\.eq\("settlement_status","PENDING"\)\.eq\("evaluation_cohort","TOP_20"\)\.gt\("kickoff_at"/);
});

test("competition pages use customer-facing fixture language", async () => {
  const [grid, detail, provenance] = await Promise.all([
    read("components/competition-grid.tsx"),
    read("app/competitions/[competitionId]/page.tsx"),
    read("components/data-provenance.tsx"),
  ]);
  assert.doesNotMatch(`${grid}\n${detail}\n${provenance}`, /persisted fixture|persisted football data/i);
  assert.match(grid, /fixture.*available/);
  assert.match(detail, /when the schedule is available/);
  assert.match(provenance, /Verified football data/);
});
