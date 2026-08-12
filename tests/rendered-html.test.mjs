import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

for (const [path, expected] of [["/", "AI-Powered Football Predictions"], ["/matches", "Match Centre"], ["/results", "Results Centre"], ["/competitions", "30 Top Football Leagues"], ["/competitions/premier-league", "Premier League"], ["/matches/ars-che-demo", "Recommended market"], ["/register", "Create your free account"], ["/login", "Secure member access"], ["/forgot-password", "Reset your password"], ["/reset-password", "Choose a new password"], ["/checkout/platform/launch", "Pay by Bank Transfer"], ["/checkout/platform/business", "Pay by Bank Transfer"], ["/sales", "Founder Launch Offer"], ["/pricing", "Start free"], ["/about", "Building trust"], ["/contact", "How can we help"]]) {
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
  assert.match(providers, /interface AuthProvider/); assert.match(providers, /MockAuthProvider/); assert.match(providers, /SupabaseAuthProvider/); assert.doesNotMatch(providers, /localStorage/);
  assert.match(repositories, /MembershipRepository/); assert.match(repositories, /PredictionUsageRepository/);
  assert.match(services, /allowance-exhausted/); assert.match(services, /premium-access/); assert.match(services, /authentication-required/);
  assert.match(config, /freePredictionAllowance:\s*3/); assert.match(config, /allowancePeriod:\s*"lifetime-welcome"/);
  assert.match(validation, /Passwords do not match/); assert.match(validation, /Accept the Terms and Privacy Policy/); assert.match(gate, /recordView/);
});

test("Batch 2C keeps interactive filters in client islands and data composition in services", async () => {
  const [matches, results, application, report, storedReport] = await Promise.all([
    readFile(new URL("../components/match-centre.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/results-centre.tsx", import.meta.url), "utf8"),
    readFile(new URL("../modules/intelligence/application.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/matches/[fixtureId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/stored-intelligence-report.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(matches, /Search teams/); assert.match(matches, /Match status/); assert.match(matches, /fixture\.status===status/);
  assert.match(results, /result\.fixtureLabel\.toLowerCase/); assert.match(results, /result\.outcome===status/);
  assert.match(application, /getResultsCentreData/); assert.doesNotMatch(matches, /mock-data/); assert.doesNotMatch(results, /mock-data/);
  assert.match(report, /StoredIntelligenceReport/); assert.match(storedReport, /Why this prediction/); assert.match(storedReport, /ShareReport/); assert.match(storedReport, /Team comparison/); assert.match(storedReport, /Frozen model output/);
});

test("unknown fixture renders the safe not-found experience", async () => {
  const response = await render("/matches/unknown-fixture");
  assert.ok([200, 404].includes(response.status)); // vinext currently streams notFound() with a 200 shell.
  assert.match(await response.text(), /Fixture not found/i);
});

test("Batch 3A sales page preserves approved commercial facts and WhatsApp journeys", async () => {
  const response = await render("/sales"); const html = await response.text(); const visibleHtml=html.replaceAll("<!-- -->","").replaceAll("&amp;","&"); const [salesSource,inquirySource]=await Promise.all([readFile(new URL("../app/sales/page.tsx",import.meta.url),"utf8"),readFile(new URL("../components/business-inquiry-form.tsx",import.meta.url),"utf8")]);
  for (const value of ["Launch Edition", "Business Edition", "7–14 Working Days", "14–21 Working Days", "₦500,000", "₦350,000", "₦1,000,000", "₦750,000", "₦18,000/month from month 7", "₦24,000/month from month 7", "First 6 months included", "30 Top Football Leagues & Competitions", "+234 810 501 6931", "Have questions before you decide?", "What We Need From You", "How long does it take to launch my platform?"]) assert.match(visibleHtml, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(visibleHtml, /first 12 months|after the first year|₦12,000\/month|Platform Care/i);
  assert.match(html, /https:\/\/wa\.me\/2348105016931\?text=/);
  assert.match(salesSource,/Can I speak to someone before buying\?[\s\S]*brand\.contactPhone/);assert.doesNotMatch(salesSource,/<b>\{brand\.contactPhone\}<\/b>/);assert.doesNotMatch(inquirySource,/<small>\{brand\.contactPhone\}<\/small>/);
  assert.match(decodeURIComponent(html), /Hello FABRO TECH LIMITED, I am interested in the 9ja Football AI Launch Edition/);
  assert.match(decodeURIComponent(html), /Hello FABRO TECH LIMITED, I am interested in the 9ja Football AI Business Edition/);
});

test("contact page makes WhatsApp the primary platform-sales channel", async () => {
  const response = await render("/contact"); const html = await response.text();
  assert.match(html, /Platform Sales/); assert.match(html, /Chat With Us on WhatsApp/); assert.match(html, /2348105016931/);
});

test("Batch 2 makes B2B ownership primary without removing flagship consumer routes", async () => {
  const home=await(await render("/")).text(),sales=await(await render("/sales")).text(),pricing=await(await render("/pricing")).text();
  for(const value of["Own a Platform","View Business Packages","Own Your Own AI Football Intelligence Platform","Explore the flagship platform"])assert.match(home,new RegExp(value,"i"));
  for(const value of["Built for Football Businesses and Communities","What You Receive","Build Your Own Subscription Revenue","Free Access plus one paid tier","Free Access plus two paid tiers","You control","We manage","Some costs may be separate","See the Technology in Action"])assert.match(sales,new RegExp(value,"i"));
  assert.match(pricing,/Consumer membership/i);assert.match(pricing,/Member Access/i);assert.match(home,/href="\/matches"/);assert.match(home,/href="\/pricing"/);
  assert.doesNotMatch(`${home}${sales}`,/>\s*(?:Demo|Sample site|Prototype|Test platform)\s*</i);
});

test("Batch 3 Sales metadata uses the dedicated 1200x630 B2B social card", async () => {
  const html=await(await render("/sales")).text(),png=await readFile(new URL("../public/og-sales.png",import.meta.url));
  assert.match(html,/og-sales\.png/);assert.match(html,/summary_large_image/);assert.match(html,/Launch Your Own AI Football Intelligence Platform/);assert.doesNotMatch(html,/property="og:image" content="https:\/\/9jafootballai\.com\.ng\/og\.png"/);
  assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
});

test("final review amendments preserve commercial terms and expose mobile navigation", async () => {
  const terms=await(await render("/business-terms")).text(),home=await(await render("/")).text(),footer=await readFile(new URL("../components/site-footer.tsx",import.meta.url),"utf8"),header=await readFile(new URL("../components/site-header.tsx",import.meta.url),"utf8");
  for(const value of["₦18,000 per month for Launch Edition","₦24,000 per month for Business Edition","fees are subject to periodic review","reasonable advance notice","normal fair-use level","must not be represented as a bookmaker","customers and subscribers"])assert.match(terms,new RegExp(value,"i"));
  assert.match(home,/Open navigation menu/);assert.match(header,/Mobile navigation/);assert.match(header,/Close navigation menu/);for(const value of["Today's Matches","Results","Competitions","Member Access","About","Own a Platform","Log in","Get started"])assert.match(header,new RegExp(value,"i"));
  assert.match(header,/createPortal\([\s\S]*document\.body/);
  assert.equal((footer.match(/href="\/contact"/g)??[]).length,1);assert.match(footer,/Company[\s\S]*href="\/contact"/);assert.doesNotMatch(footer,/Legal[\s\S]*href="\/contact"/);
});

test("Batch 4F homepage and football routes render repository read-model sections",async()=>{const home=await(await render("/")).text(),matches=await(await render("/matches")).text(),results=await(await render("/results")).text(),competitions=await(await render("/competitions")).text();for(const value of["Built for 30 Top Football Leagues","Upcoming matches","Football intelligence preview","Recent results"])assert.match(home,new RegExp(value,"i"));assert.match(matches,/Upcoming/);assert.match(matches,/Competition/);assert.match(results,/Completed and cancelled fixtures/);assert.match(competitions,/rolling out competition by competition/i);assert.doesNotMatch(home,/all 30 (?:are )?live/i)});

test("guest responses do not contain registered or Premium report intelligence",async()=>{const registered=await(await render("/matches/int-ata-demo")).text(),premium=await(await render("/matches/bar-bay-demo")).text();assert.match(registered,/Create an account to continue/);assert.match(premium,/Create an account to continue/);assert.doesNotMatch(registered,/Both attacking profiles support at least two total goals/);assert.doesNotMatch(premium,/Elite attacking quality raises the ceiling/)});

test("Batch 3C report exposes deterministic multi-market AI intelligence", async () => {
  const response = await render("/matches/ars-che-demo"); const html = await response.text();
  for (const value of ["Recommended market", "Markets analysed", "Match Winner", "Double Chance", "Both Teams To Score", "Over 2.5 Goals", "Tactical outlook", "Expected match flow", "Confidence explanation", "Risk explanation", "Markets to avoid", "AI-assisted football intelligence"]) assert.match(html, new RegExp(value, "i"));
  assert.match(html, /relative signal, not a guarantee/i);
  assert.match(html, /Match events, selections and finishing variance can invalidate the projection/i);
});

test("mock AI provider is provider-compatible, deterministic and offline", async () => {
  const [provider, services, application, domain] = await Promise.all([
    readFile(new URL("../modules/intelligence/mock-ai-provider.ts", import.meta.url), "utf8"), readFile(new URL("../modules/intelligence/services.ts", import.meta.url), "utf8"),
    readFile(new URL("../modules/intelligence/application.ts", import.meta.url), "utf8"), readFile(new URL("../modules/intelligence/domain.ts", import.meta.url), "utf8"),
  ]);
  assert.match(provider, /implements AIIntelligenceProvider/); assert.match(provider, /marketsToAvoid/); assert.match(provider, /tacticalOutlook/);
  assert.doesNotMatch(provider, /fetch\(|OpenAI|process\.env|prompt/i); assert.match(services, /aiProvider\.generateMatchIntelligence/);
  assert.match(application, /new MockAIIntelligenceProvider/); assert.match(domain, /"very-high"\|"high"\|"medium"\|"low"/);
});

test("Batch 3D checkout displays configured transfer facts and remains pending", async () => {
  const launch = (await (await render("/checkout/platform/launch")).text()).replaceAll("<!-- -->",""); const business = (await (await render("/checkout/platform/business")).text()).replaceAll("<!-- -->","");
  for (const html of [launch,business]) { assert.match(html,/FABRO TECH LIMITED/); assert.match(html,/GTBank/); assert.match(html,/0603685542/); assert.match(html,/Pending Payment/); assert.match(html,/Business Terms/); assert.match(html,/Refund\/Cancellation Policy/); assert.match(html,/Accept the terms to continue/i); }
  assert.match(launch,/₦350,000/); assert.match(launch,/₦18,000\/month/); assert.match(launch,/First 6 months included/);
  assert.match(business,/₦750,000/); assert.match(business,/₦24,000\/month/);
});

test("billing providers are swappable placeholders with no live gateway calls", async () => {
  const [domain, providers, services, config, checkout] = await Promise.all([
    readFile(new URL("../modules/billing/domain.ts", import.meta.url),"utf8"), readFile(new URL("../modules/billing/providers.ts", import.meta.url),"utf8"),
    readFile(new URL("../modules/billing/services.ts", import.meta.url),"utf8"), readFile(new URL("../config/payment.ts", import.meta.url),"utf8"),
    readFile(new URL("../app/checkout/platform/[packageId]/page.tsx", import.meta.url),"utf8"),
  ]);
  assert.match(domain,/BillingInterval="monthly"\|"yearly"\|"lifetime"/); assert.match(domain,/TenantPaymentSettings/); assert.match(domain,/payment-submitted/);
  assert.match(providers,/interface PaymentProvider/); assert.match(providers,/class PaystackPaymentProvider/); assert.match(providers,/class FlutterwavePaymentProvider/); assert.match(providers,/class StripePaymentProvider/);
  assert.match(providers,/Not implemented\./); assert.doesNotMatch(providers,/fetch\(|process\.env|api[_-]?key/i); assert.match(services,/activeProviderId/);
  assert.match(config,/activeProvider:"manual-bank"/); assert.doesNotMatch(checkout,/0603685542/);
});
