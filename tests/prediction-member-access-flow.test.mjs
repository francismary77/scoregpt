import "tsx/esm";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const { PredictionEntitlementService } = await import("../modules/account/services.ts");

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const user = { id: "user-1", email: "member@example.test", displayName: "Member", createdAt: "2026-08-15T00:00:00Z", role: "user" };

function service({ premium = false, unlocked = [] } = {}) {
  const viewedFixtureIds = [...unlocked];
  const membership = { async getDisplay() { return { tier: premium ? "premium" : "free", status: premium ? "active" : "none", label: premium ? "Premium" : "Free", hasPremiumAccess: premium }; } };
  const usage = {
    async getUsageForUser() { return { userId: user.id, viewedFixtureIds: [...viewedFixtureIds], used: viewedFixtureIds.length, updatedAt: "2026-08-15T00:00:00Z" }; },
    async unlockPrediction(_userId, fixtureId) { const alreadyUnlocked = viewedFixtureIds.includes(fixtureId); if (!alreadyUnlocked && viewedFixtureIds.length >= 3) throw new Error("allowance_exhausted"); if (!alreadyUnlocked) viewedFixtureIds.push(fixtureId); return { reportId: fixtureId, alreadyUnlocked, remaining: 3 - viewedFixtureIds.length }; },
  };
  return { entitlement: new PredictionEntitlementService(membership, usage), viewedFixtureIds };
}

test("logged-out, Free, exhausted Free and Premium decisions preserve one entitlement model", async () => {
  const free = service();
  assert.equal((await free.entitlement.decide(null, "premium", "a")).reason, "authentication-required");
  assert.deepEqual(await free.entitlement.decide(user, "premium", "a"), { allowed: true, tier: "free", remaining: 3, reason: "free-allowance", requiresAuthentication: false, requiresUpgrade: false });
  await free.entitlement.unlock(user, "a"); await free.entitlement.unlock(user, "b"); await free.entitlement.unlock(user, "c");
  assert.equal((await free.entitlement.decide(user, "premium", "a")).reason, "previously-unlocked");
  assert.deepEqual(await free.entitlement.decide(user, "premium", "d"), { allowed: false, tier: "free", remaining: 0, reason: "allowance-exhausted", requiresAuthentication: false, requiresUpgrade: true });
  assert.equal((await service({ premium: true }).entitlement.decide(user, "premium", "d")).reason, "premium-access");
});

test("Member Access is prediction-first and uses the same server unlock repository", async () => {
  const [page, action, account, match, home] = await Promise.all([read("app/pricing/page.tsx"), read("app/pricing/actions.ts"), read("app/account/page.tsx"), read("app/matches/[fixtureId]/page.tsx"), read("app/page.tsx")]);
  assert.match(page, /Available Predictions/); assert.match(page, /Free predictions remaining/); assert.match(page, /Unlock Prediction/); assert.match(page, /usage\.viewedFixtureIds\.includes/);
  assert.doesNotMatch(page, /href=\{plan\.href\}[\s\S]*Try Free Prediction/);
  assert.match(action, /predictionUsage\.unlockPrediction\(user\.id, fixtureId\)/); assert.match(action, /revalidatePath\("\/account"\)/);
  assert.match(account, /predictionUsage\.getRemainingAllowance/); assert.match(match, /predictionUsage\.getUsageForUser/); assert.match(match, /createPrivilegedFootballExperienceService/);
  assert.match(home, /href="\/pricing" className="button button-ghost">Explore Predictions/);
});

test("forward migration admits unlocked Premium reports without weakening publication gates", async () => {
  const sql = await read("supabase/migrations/202608150006_prediction_member_access.sql");
  assert.match(sql, /access_level in \('public','registered','premium'\)/);
  assert.match(sql, /pg_advisory_xact_lock/); assert.match(sql, /v_allowance constant integer:=3/); assert.match(sql, /already_unlocked/); assert.match(sql, /allowance_exhausted/);
  assert.match(sql, /consumer_publication_state='PUBLISHED'/); assert.match(sql, /r\.is_demo=false/); assert.match(sql, /f\.is_demo=false/);
  assert.match(sql, /prediction_usage\.user_id=\(select auth\.uid\(\)\)/);
  assert.doesNotMatch(sql, /delete from|truncate|drop table|grant select on public\.football_shadow_predictions/i);
});

test("match navigation explicitly restores top-of-page scrolling", async () => {
  const [card, home, pricing] = await Promise.all([read("components/football-fixture-card.tsx"), read("app/page.tsx"), read("app/pricing/page.tsx")]);
  assert.match(card, /<Link scroll href=\{`\/matches\//); assert.match(home, /<Link scroll href=\{`\/matches\//); assert.match(pricing, /<Link scroll className="button button-ghost" href=\{`\/matches\//);
});
