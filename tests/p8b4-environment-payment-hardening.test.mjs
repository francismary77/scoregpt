import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateSupabaseEnvironment } from "../lib/supabase/server-environment.ts";
import { paymentsEnabled, requirePaymentsEnabled } from "../modules/billing/runtime-config.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const developmentRef = "a".repeat(20), productionRef = "b".repeat(20);
const config = (environment, ref) => ({ VERCEL_ENV: environment === "production" ? "production" : "preview", SUPABASE_ENVIRONMENT: environment, SUPABASE_PROJECT_REF: ref, NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co` });

test("Supabase isolation accepts each configured project only in its matching runtime", () => {
  assert.equal(validateSupabaseEnvironment(config("development", developmentRef)).projectRef, developmentRef);
  assert.equal(validateSupabaseEnvironment(config("production", productionRef)).projectRef, productionRef);
  assert.throws(() => validateSupabaseEnvironment({ ...config("production", developmentRef), SUPABASE_ENVIRONMENT: "development" }), /environment_mismatch/);
  assert.throws(() => validateSupabaseEnvironment({ ...config("development", productionRef), SUPABASE_PROJECT_REF: developmentRef }), /project_mismatch/);
});

test("disabled payment gate fails closed", () => {
  assert.equal(paymentsEnabled({ PAYMENTS_ENABLED: "false" }), false);
  assert.throws(() => requirePaymentsEnabled({ PAYMENTS_ENABLED: "false" }), /payments_disabled/);
});

test("all privileged billing repositories use environment isolation and mutation gates", async () => {
  const files = ["b2b-checkout-repository.ts", "consumer-subscription-repository.ts", "managed-platform-repository.ts", "manual-transfer.ts", "webhook-repository.ts", "customer-billing.ts"];
  for (const file of files) {
    const source = await read(`modules/billing/${file}`);
    assert.match(source, /requireServiceRoleSupabaseConfig/);
    assert.doesNotMatch(source, /oislplqdvtaajqxbwvut|development_supabase_required/);
  }
  for (const file of files.slice(0, 5)) assert.match(await read(`modules/billing/${file}`), /requirePaymentsEnabled/);
});

test("disabled payment UI and account fallback are non-actionable and credential independent", async () => {
  const [checkout, account, cta, services] = await Promise.all([read("app/checkout/platform/[packageId]/page.tsx"), read("app/account/page.tsx"), read("components/consumer-subscription-cta.tsx"), read("modules/billing/services.ts")]);
  assert.match(checkout, /No payment action is available/);
  assert.match(account, /billingAvailable \? await new CustomerBillingRepository/);
  assert.match(cta, /Premium checkout is not currently available/);
  assert.match(services, /enabled: paymentsEnabled &&/);
});

test("server-only credentials are not declared as public variables", async () => {
  const sources = await Promise.all([read(".env.example"), read("lib/supabase/server-environment.ts")]);
  assert.match(sources[0], /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.doesNotMatch(sources.join("\n"), /NEXT_PUBLIC_(?:SUPABASE_SERVICE_ROLE_KEY|PAYSTACK_SECRET_KEY)/);
});
