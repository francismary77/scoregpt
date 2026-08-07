import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

for (const [path, expected] of [["/", "Smarter Football Predictions"], ["/matches", "Match Centre"], ["/results", "Public Results Centre"], ["/matches/ars-che-demo", "Home win or draw"], ["/register", "Create your free account"], ["/login", "Demo access"], ["/forgot-password", "Reset your password"], ["/dashboard", "Checking your session"], ["/account", "Checking your session"], ["/admin", "Checking your session"], ["/sales", "Founder Launch Offer"], ["/pricing", "Start free"], ["/about", "Building trust"], ["/contact", "How can we help"]]) {
  test(`server renders ${path}`, async () => { const response = await render(path); assert.equal(response.status, 200); assert.match(await response.text(), new RegExp(expected, "i")); });
}

test("intelligence records and UI retain demo safety markers", async () => {
  const [data, domain, application] = await Promise.all([readFile(new URL("../modules/intelligence/mock-data.ts", import.meta.url), "utf8"), readFile(new URL("../modules/intelligence/domain.ts", import.meta.url), "utf8"), readFile(new URL("../modules/intelligence/application.ts", import.meta.url), "utf8")]);
  assert.match(data, /sourceType:\s*"mock"/); assert.match(data, /isDemo:\s*true/); assert.match(domain, /value < 0 \|\| value > 100/); assert.match(application, /MockFixtureRepository/);
});

test("Batch 2D auth and membership boundaries remain provider-neutral and demo-safe", async () => {
  const [domain, providers, services, repositories, validation, config, gate] = await Promise.all([
    readFile(new URL("../modules/account/domain.ts", import.meta.url), "utf8"), readFile(new URL("../modules/account/providers.ts", import.meta.url), "utf8"),
    readFile(new URL("../modules/account/services.ts", import.meta.url), "utf8"), readFile(new URL("../modules/account/repositories.ts", import.meta.url), "utf8"),
    readFile(new URL("../modules/account/validation.ts", import.meta.url), "utf8"), readFile(new URL("../config/application.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/report-access-gate.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(domain, /PredictionAccessDecision/); assert.match(domain, /"public"\|"registered"\|"premium"/);
  assert.match(providers, /interface AuthProvider/); assert.match(providers, /MockAuthProvider/); assert.match(providers, /sessionStorage/); assert.doesNotMatch(providers, /localStorage|jwt|token/i);
  assert.match(repositories, /MembershipRepository/); assert.match(repositories, /PredictionUsageRepository/);
  assert.match(services, /allowance-exhausted/); assert.match(services, /premium-access/); assert.match(services, /authentication-required/);
  assert.match(config, /freePredictionAllowance:\s*3/); assert.match(config, /allowancePeriod:\s*"lifetime-welcome"/);
  assert.match(validation, /Passwords do not match/); assert.match(validation, /Accept the Terms and Privacy Policy/); assert.match(gate, /recordView/);
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

test("Batch 3A sales page preserves approved commercial facts and WhatsApp journeys", async () => {
  const response = await render("/sales"); const html = await response.text();
  for (const value of ["7–14 Working Days", "14–21 Working Days", "₦350,000", "₦750,000", "₦12,000/month", "₦18,000/month", "+234 810 501 6931", "Have questions before you decide?", "What We Need From You", "How long does it take to launch my platform?"]) assert.match(html, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(html, /https:\/\/wa\.me\/2348105016931\?text=/);
  assert.match(decodeURIComponent(html), /Hello FABRO TECH LIMITED, I am interested in the ScoreGPT Launch Edition/);
  assert.match(decodeURIComponent(html), /Hello FABRO TECH LIMITED, I am interested in the ScoreGPT Business Edition/);
});

test("contact page makes WhatsApp the primary platform-sales channel", async () => {
  const response = await render("/contact"); const html = await response.text();
  assert.match(html, /Platform Sales/); assert.match(html, /Ask on WhatsApp/); assert.match(html, /2348105016931/);
});
