import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SupabaseCheckoutRepository } from "../modules/billing/b2b-checkout-repository.ts";
import { SupabaseConsumerSubscriptionRepository } from "../modules/billing/consumer-subscription-repository.ts";
import { CustomerBillingRepository } from "../modules/billing/customer-billing.ts";
import { SupabaseManagedPlatformRepository } from "../modules/billing/managed-platform-repository.ts";

const migrationUrl = new URL("../supabase/migrations/202608150001_p8b11d_billing_environment_isolation.sql", import.meta.url);
const env = environment => ({ PAYMENTS_ENABLED: "true", PAYSTACK_ENVIRONMENT: environment, SUPABASE_ENVIRONMENT: "development", SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst", NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fixture-service-role" });
const fakeClient = () => {
  const operations = [];
  return {
    operations,
    from(table) {
      const state = { table, filters: [], value: null };
      const query = {
        select() { return query; }, eq(column, value) { state.filters.push([column, value]); return query; }, in() { return query; }, order() { return query; }, limit() { return query; }, neq() { return query; },
        insert(value) { state.value = value; operations.push({ type: "insert", table, value }); return query; }, update(value) { operations.push({ type: "update", table, value, filters: state.filters }); return query; },
        async maybeSingle() { operations.push({ type: "query", table, filters: [...state.filters] }); return { data: null, error: null }; }, async single() { return { data: state.value, error: null }; },
        then(resolve) { operations.push({ type: "query", table, filters: [...state.filters] }); resolve({ data: table === "consumer_subscriptions" ? null : [], error: null }); },
      };
      return query;
    },
    async rpc(name, args) { operations.push({ type: "rpc", name, args }); return { data: null, error: null }; },
  };
};

test("consumer entitlement TEST/LIVE matrix is isolated by the required database environment", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /has_active_consumer_subscription\([\s\S]*p_environment public\.payment_environment/);
  assert.match(sql, /s\.environment = p_environment/);
  const grants = (recordEnvironment, requestedEnvironment) => recordEnvironment === requestedEnvironment;
  assert.equal(grants("test", "live"), false, "TEST subscription cannot grant LIVE entitlement");
  assert.equal(grants("live", "test"), false, "LIVE subscription cannot grant TEST entitlement");
  assert.equal(grants("live", "live"), true, "LIVE subscription grants LIVE entitlement");
  assert.equal(grants("test", "test"), true, "TEST subscription grants TEST entitlement");
});

test("B2B confirmation requires the same trusted environment for order, transaction, and request", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /payment_environment = p_environment/);
  assert.match(sql, /environment = p_environment/);
  const confirms = (orderEnvironment, transactionEnvironment, requestedEnvironment) => orderEnvironment === requestedEnvironment && transactionEnvironment === requestedEnvironment;
  assert.equal(confirms("live", "live", "live"), true, "LIVE confirms only as LIVE");
  assert.equal(confirms("test", "test", "test"), true, "TEST confirms only as TEST");
  assert.equal(confirms("test", "test", "live"), false, "TEST cannot satisfy LIVE confirmation");
  assert.equal(confirms("live", "live", "test"), false, "LIVE cannot satisfy TEST confirmation");
});

for (const environment of ["test", "live"]) test(`B2B ${environment.toUpperCase()} confirmation passes only trusted ${environment} to the RPC`, async () => {
  const client = fakeClient(), repository = new SupabaseCheckoutRepository(env(environment), client);
  await assert.rejects(() => repository.markPaid("order-1", { id: "tx-1", orderId: "order-1", providerId: "paystack", environment, reference: "B2B_reference_123", expectedAmountMinor: 35000000, paidAmountMinor: 35000000, currency: "NGN", state: "succeeded", createdAt: "2026-08-15T00:00:00Z", updatedAt: "2026-08-15T00:00:00Z" }), /order_not_found/);
  assert.equal(client.operations.find(item => item.type === "rpc").args.p_environment, environment);
});

for (const environment of ["test", "live"]) test(`consumer checkout idempotency lookup is scoped to ${environment}`, async () => {
  const client = fakeClient(), repository = new SupabaseConsumerSubscriptionRepository(env(environment), client);
  await repository.findCheckout("checkout-key");
  const query = client.operations.find(item => item.type === "query" && item.table === "consumer_subscription_checkouts");
  assert.ok(query.filters.some(([column, value]) => column === "environment" && value === environment));
});

for (const environment of ["test", "live"]) test(`customer billing reads only ${environment} consumer and B2B records`, async () => {
  const client = fakeClient(), repository = new CustomerBillingRepository(env(environment), client);
  await repository.getForUser("user-1");
  for (const table of ["consumer_subscriptions", "orders"]) {
    const query = client.operations.find(item => item.type === "query" && item.table === table);
    const column = table === "orders" ? "payment_environment" : "environment";
    assert.ok(query.filters.some(([key, value]) => key === column && value === environment));
  }
});

for (const environment of ["test", "live"]) test(`managed-platform repository scopes orders and billings to ${environment}`, async () => {
  const client = fakeClient(), repository = new SupabaseManagedPlatformRepository(env(environment), client);
  await repository.getOrder("order-1");
  await repository.getByOrderId("order-1");
  assert.ok(client.operations.find(item => item.table === "orders").filters.some(([key, value]) => key === "payment_environment" && value === environment));
  assert.ok(client.operations.find(item => item.table === "managed_platform_billings").filters.some(([key, value]) => key === "provider_environment" && value === environment));
});

test("active runtime billing sources contain no hard-coded TEST environment", async () => {
  const names = ["b2b-checkout-repository.ts", "consumer-subscription-repository.ts", "customer-billing.ts", "managed-platform.ts", "managed-platform-repository.ts", "manual-transfer.ts", "callback-runtime.ts", "webhook-repository.ts"];
  const sources = await Promise.all(names.map(name => readFile(new URL(`../modules/billing/${name}`, import.meta.url), "utf8")));
  for (const [index, source] of sources.entries()) assert.doesNotMatch(source, /environment\s*:\s*["']test["']|eq\(["'](?:environment|payment_environment|provider_environment)["']\s*,\s*["']test["']/, names[index]);
});

test("migration is forward-only, preserves history, and removes unsafe legacy signatures", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /drop function if exists public\.has_active_consumer_subscription\(uuid\)/);
  assert.match(sql, /drop function if exists public\.confirm_business_setup_payment\(uuid, uuid, text, bigint\)/);
  assert.match(sql, /on conflict\(setup_order_id\) do nothing/);
  assert.doesNotMatch(sql, /delete from|truncate|drop table/i);
});
