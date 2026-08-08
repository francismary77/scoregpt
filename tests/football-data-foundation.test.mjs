import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Batch 4C request audit is RLS-protected and has no public write grant", async () => {
  const sql = await read("../supabase/migrations/202608080002_batch_4c_football_ingestion.sql");
  assert.match(sql, /create table if not exists public\.football_provider_requests/i);
  assert.match(sql, /alter table public\.football_provider_requests enable row level security/i);
  assert.match(sql, /revoke all on table public\.football_provider_requests from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /create policy .*football_provider_requests/i);
  assert.doesNotMatch(sql, /grant .*football_provider_requests.*(?:anon|authenticated)/i);
  assert.match(sql, /'odds'/);
});

test("live football ingestion defaults off and exposes no key variable", async () => {
  const env = await read("../.env.example");
  assert.match(env, /^FOOTBALL_DATA_PROVIDER=disabled$/m);
  assert.match(env, /^FOOTBALL_DATA_PROVIDER_ENABLED=false$/m);
  assert.match(env, /^FOOTBALL_API_DAILY_REQUEST_BUDGET=100$/m);
  assert.doesNotMatch(env, /FOOTBALL.*(?:KEY|TOKEN|SECRET)/i);
});

test("future API-Football insertion stays behind provider and repository contracts", async () => {
  const provider = await read("../modules/intelligence/providers.ts");
  const service = await read("../modules/football-data/service.ts");
  const repository = await read("../modules/football-data/repositories.ts");
  assert.match(provider, /fetchCompetitionData/);
  assert.match(provider, /fetchFixtureData/);
  assert.match(service, /getSnapshot/);
  assert.match(service, /hasBudget/);
  assert.match(repository, /ingestBundle/);
});
