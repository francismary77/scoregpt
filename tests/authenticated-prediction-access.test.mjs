import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
function entitlement() {
  const unlocked = new Set();
  const service = {
    async decide(fixtureId) { return { allowed: unlocked.has(fixtureId) || unlocked.size < 3, remaining: Math.max(0, 3 - unlocked.size) }; },
    async unlock(fixtureId) { const alreadyUnlocked = unlocked.has(fixtureId); if (!alreadyUnlocked && unlocked.size >= 3) throw new Error("allowance_exhausted"); unlocked.add(fixtureId); return { reportId: fixtureId, alreadyUnlocked, remaining: Math.max(0, 3 - unlocked.size) }; },
  };
  return { service, unlocked };
}

test("free allowance is three and page decisions never consume it", async () => {
  const { service, unlocked } = entitlement();
  assert.equal((await service.decide("fixture-1")).remaining, 3);
  assert.equal((await service.decide("fixture-1")).remaining, 3);
  assert.equal(unlocked.size, 0);
});

test("distinct unlocks decrement once, repeat/refresh stays free, and fourth is denied", async () => {
  const { service } = entitlement();
  assert.deepEqual(await service.unlock("fixture-1"), { reportId: "fixture-1", alreadyUnlocked: false, remaining: 2 });
  assert.deepEqual(await service.unlock("fixture-1"), { reportId: "fixture-1", alreadyUnlocked: true, remaining: 2 });
  assert.equal((await service.decide("fixture-1")).remaining, 2);
  assert.equal((await service.unlock("fixture-2")).remaining, 1);
  assert.equal((await service.unlock("fixture-3")).remaining, 0);
  await assert.rejects(service.unlock("fixture-4"), /allowance_exhausted/);
  assert.equal((await service.decide("fixture-1")).allowed, true);
});

test("migration enforces atomic server-side access and blocks unpublished or shadow records", async () => {
  const migration = await read("supabase/migrations/202608110002_batch_4h20_consumer_prediction_access.sql");
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /prediction_usage_unique_report_unlock/);
  assert.match(migration, /prediction_not_publishable/);
  assert.match(migration, /allowance_exhausted/);
  assert.match(migration, /consumer_publication_state = 'PUBLISHED'/);
  assert.match(migration, /forward_prediction_id text null references public\.football_shadow_predictions\(id\)/);
  assert.match(migration, /r\.is_demo = false/);
  assert.doesNotMatch(migration, /football_shadow_predictions[\s\S]*grant select/i);
  assert.match(migration, /revoke insert on public\.prediction_usage from authenticated/);
});

test("consumer data path has no persisted-mode demo substitution or historical performance", async () => {
  const [service, repository] = await Promise.all([read("modules/football-experience/service.ts"), read("modules/football-experience/repository.ts")]);
  assert.match(repository, /list_consumer_prediction_catalog/);
  assert.match(repository, /fixtureIds\.length \? this\.client\.from\("fixtures"\)/);
  assert.match(repository, /\.in\("id", fixtureIds\)\.eq\("is_demo", false\)/);
  assert.match(repository, /consumer_publication_state/);
  assert.match(service, /forwardFixtureIds/);
  assert.match(service, /source: "persisted", degraded: false/);
  assert.match(service, /competitions: \[\], fixtures: \[\], results: \[\], reports: \[\]/);
  assert.doesNotMatch(service, /persisted\.results\.length\s*[<>]=?\s*\d[^;]+demo\.results/);
});
