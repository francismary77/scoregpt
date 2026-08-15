import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { membershipFromSubscription } from "../modules/account/membership-resolver.ts";

const now = "2026-08-15T12:00:00.000Z";
const subscription = patch => ({
  id: "sub-1", userId: "user-1", billingCustomerId: "customer-1", productKey: "consumer-premium-monthly",
  priceId: "price-1", providerId: "paystack", environment: "live", providerPlanReference: "PLN_fixture123",
  providerCustomerReference: "CUS_fixture123", initialPaymentReference: "TXN_fixture123",
  providerSubscriptionReference: "SUB_fixture123", amountMinor: 300000, currency: "NGN", billingInterval: "monthly",
  status: "active", entitlementStatus: "active", currentPeriodStart: "2026-08-15T00:00:00.000Z",
  currentPeriodEnd: "2026-09-15T00:00:00.000Z", nextBillingAt: "2026-09-15T00:00:00.000Z",
  cancelAtPeriodEnd: false, createdAt: now, updatedAt: now, ...patch,
});

test("authoritative membership grants Premium only for a current genuine active entitlement", () => {
  assert.equal(membershipFromSubscription(subscription({}), Date.parse(now)).hasPremiumAccess, true);
  for (const patch of [
    { environment: "test", status: "cancelled" }, { entitlementStatus: "inactive" },
    { providerSubscriptionReference: "TXN_not_a_subscription" }, { currentPeriodEnd: "2026-08-14T00:00:00.000Z" },
  ]) assert.equal(membershipFromSubscription(subscription(patch), Date.parse(now)).hasPremiumAccess, false);
});

test("dashboard, account, pricing, and match authorization use the subscription resolver", async () => {
  const sources = await Promise.all([
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/pricing/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/matches/[fixtureId]/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of sources) assert.match(source, /resolveConsumerMembership|membershipFromSubscription/);
  assert.doesNotMatch(sources.join("\n"), /repositories\.membership\.getMembershipForUser/);
});

test("Premium UI removes quota and repeat-purchase prompts while Free UI remains conditional", async () => {
  const [members, pricing] = await Promise.all([
    readFile(new URL("../components/member-pages.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/pricing/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(members, /Full Premium access/);
  assert.match(members, /!data\.membership\.hasPremiumAccess&&<Link href="\/pricing">Upgrade to Premium/);
  assert.match(pricing, /Premium member/);
  assert.match(pricing, /Manage subscription/);
  assert.match(pricing, /!membership\.hasPremiumAccess&&[\s\S]*ConsumerSubscriptionCta/);
});

test("consumer initialization still rejects an existing current subscription before provider initialization", async () => {
  const [source, route] = await Promise.all([
    readFile(new URL("../modules/billing/consumer-subscriptions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/payments/consumer-subscription/initialize/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(source, /getByUser\(input\.userId\)/);
  assert.match(source, /\["pending","active","past_due"\]\.includes\(existing\.status\)/);
  assert.match(route, /subscription_already_exists/);
});

test("forward migration idempotently creates the missing environment-scoped consumer payment ledger", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202608150002_p8b12_consumer_payment_ledger.sql", import.meta.url), "utf8");
  assert.match(sql, /purpose, subject_type, subject_id, environment/);
  assert.match(sql, /'consumer_subscription', 'user', s\.user_id, s\.environment/);
  assert.match(sql, /on conflict \(provider, environment, reference\) do nothing/);
  assert.doesNotMatch(sql, /delete from|truncate|drop table/i);
});
