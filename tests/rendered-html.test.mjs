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
