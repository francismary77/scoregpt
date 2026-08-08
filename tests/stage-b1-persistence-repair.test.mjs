import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../modules/persistence/football-repositories.ts", import.meta.url),
  "utf8",
);

test("Supabase bundle persistence uses bounded bulk writes", () => {
  const ingestBundle = source.slice(
    source.indexOf("async ingestBundle("),
    source.indexOf("async findLatestSnapshot("),
  );

  assert.match(ingestBundle, /\.from\("fixtures"\)\.upsert\(rows,/);
  assert.match(ingestBundle, /\.from\("football_data_snapshots"\)\.upsert\(rows,/);
  assert.doesNotMatch(ingestBundle, /for \(const fixture of payload\.fixtures\)/);
  assert.doesNotMatch(ingestBundle, /for \(const snapshot of payload\.snapshots\)/);
});
