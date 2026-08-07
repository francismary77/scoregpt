import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

for (const [path, expected] of [["/", "Smarter Football Predictions"], ["/matches", "Match Centre"], ["/results", "Public Results Centre"], ["/matches/ars-che-demo", "Home win or draw"], ["/sales", "Founder Launch Offer"], ["/pricing", "Start free"], ["/about", "Building trust"], ["/contact", "How can we help"]]) {
  test(`server renders ${path}`, async () => { const response = await render(path); assert.equal(response.status, 200); assert.match(await response.text(), new RegExp(expected, "i")); });
}

test("intelligence records and UI retain demo safety markers", async () => {
  const [data, domain, application] = await Promise.all([readFile(new URL("../modules/intelligence/mock-data.ts", import.meta.url), "utf8"), readFile(new URL("../modules/intelligence/domain.ts", import.meta.url), "utf8"), readFile(new URL("../modules/intelligence/application.ts", import.meta.url), "utf8")]);
  assert.match(data, /sourceType:\s*"mock"/); assert.match(data, /isDemo:\s*true/); assert.match(domain, /value < 0 \|\| value > 100/); assert.match(application, /MockFixtureRepository/);
});

test("Batch 2C keeps interactive filters in client islands and data composition in services", async () => {
  const [matches, results, application, report] = await Promise.all([
    readFile(new URL("../components/match-centre.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/results-centre.tsx", import.meta.url), "utf8"),
    readFile(new URL("../modules/intelligence/application.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/matches/[fixtureId]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(matches, /Search teams/); assert.match(matches, /Match status/); assert.match(matches, /fixture\.status===status/);
  assert.match(results, /result\.fixtureLabel\.toLowerCase/); assert.match(results, /result\.outcome===status/);
  assert.match(application, /getResultsCentreData/); assert.doesNotMatch(matches, /mock-data/); assert.doesNotMatch(results, /mock-data/);
  assert.match(report, /Why this prediction/); assert.match(report, /ShareReport/); assert.match(report, /Team comparison/);
});

test("unknown fixture renders the safe not-found experience", async () => {
  const response = await render("/matches/unknown-fixture");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Fixture not found/i);
});
