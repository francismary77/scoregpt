import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/202608070001_batch_4a_foundation.sql", import.meta.url);

test("Batch 4A migration defines every required table with RLS", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const tables = [
    "profiles", "memberships", "prediction_usage", "competitions", "teams", "fixtures",
    "football_data_snapshots", "intelligence_reports", "prediction_markets", "orders", "payment_transactions",
  ];
  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table} \\(`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
});

test("public report access is explicitly limited and secrets are not embedded", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /access_level = 'public'/);
  assert.doesNotMatch(sql, /service_role|postgres(?:ql)?:\/\//i);

  const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_URL=$/m);
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$/m);
});

test("development seed is unmistakably demo-only", async () => {
  const seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  assert.match(seed, /scoregpt-demo/);
  assert.match(seed, /is_demo/);
  assert.doesNotMatch(seed, /insert into public\.(orders|payment_transactions|prediction_usage)/i);
});

test("persistence composition retains a configuration-safe mock fallback", async () => {
  const composition = await readFile(new URL("../modules/persistence/server.ts", import.meta.url), "utf8");
  assert.match(composition, /!featureFlags\.useSupabasePersistence \|\| !getSupabasePublicConfig\(\)/);
  assert.match(composition, /createPersistenceRepositories\(\)/);
});
