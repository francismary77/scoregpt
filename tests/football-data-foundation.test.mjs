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

test("live football ingestion defaults off and documents a server-only key placeholder", async () => {
  const env = await read("../.env.example");
  assert.match(env, /^FOOTBALL_DATA_PROVIDER=disabled$/m);
  assert.match(env, /^FOOTBALL_DATA_PROVIDER_ENABLED=false$/m);
  assert.match(env, /^FOOTBALL_API_KEY=$/m);
  assert.match(env, /^FOOTBALL_API_DAILY_REQUEST_BUDGET=30$/m);
  assert.match(env, /^FOOTBALL_INGESTION_DRY_RUN=true$/m);
  assert.doesNotMatch(env, /^NEXT_PUBLIC_.*FOOTBALL.*(?:KEY|TOKEN|SECRET)/im);
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

test("API-Football credentials and raw structures stay behind server-only boundaries", async () => {
  const [adapter, serverConfig, manual] = await Promise.all([read("../modules/football-data/api-football-provider.ts"), read("../modules/football-data/server-config.ts"), read("../modules/football-data/manual.ts")]);
  for (const source of [adapter, serverConfig, manual]) assert.match(source, /@\/lib\/server-only/);
  assert.match(serverConfig, /process\.env\.FOOTBALL_API_KEY/);
  assert.doesNotMatch(adapter, /NEXT_PUBLIC_/);
  for (const path of ["../app/page.tsx", "../app/matches/page.tsx", "../app/results/page.tsx", "../app/matches/[fixtureId]/page.tsx"]) assert.doesNotMatch(await read(path), /football-data\/(?:manual|service|api-football-provider)|fetchCompetitionData|fetchFixtureData|x-apisports-key/);
  for (const path of ["../modules/football-data/repositories.ts", "../modules/persistence/football-repositories.ts"]) assert.doesNotMatch(await read(path), /x-apisports-key|ApiEnvelope|\.response\b/);
});

test("persisted homepage readiness is repository-based and never provider-backed", async () => {
  const source = await read("../modules/persistence/football-repositories.ts");
  assert.match(source, /class SupabasePersistedFootballReadRepository/);
  for (const table of ["competitions", "fixtures", "intelligence_reports"]) assert.match(source, new RegExp(`from\\(\"${table}\"\\)`));
  const readRepository = source.slice(source.indexOf("class SupabasePersistedFootballReadRepository"));
  assert.doesNotMatch(readRepository, /fetch\(|ApiFootballProvider|FOOTBALL_API_KEY|x-apisports-key/);
});
