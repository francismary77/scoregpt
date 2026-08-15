import "../../lib/server-only.ts";
import type { MembershipDisplay } from "./domain";
import type { ConsumerSubscription } from "../billing/domain.ts";
import { isGenuinePaystackSubscriptionReference } from "../billing/consumer-subscriptions.ts";
import { SupabaseConsumerSubscriptionRepository } from "../billing/consumer-subscription-repository.ts";

export function membershipFromSubscription(subscription: ConsumerSubscription | null, now = Date.now()): MembershipDisplay {
  const current = !subscription?.currentPeriodEnd || Date.parse(subscription.currentPeriodEnd) > now;
  const premium = Boolean(subscription && subscription.status === "active" && subscription.entitlementStatus === "active"
    && isGenuinePaystackSubscriptionReference(subscription.providerSubscriptionReference) && current);
  return premium
    ? { tier: "premium", status: "active", label: "Premium", hasPremiumAccess: true }
    : { tier: "free", status: "active", label: "Free", hasPremiumAccess: false };
}

export async function resolveConsumerMembership(userId: string): Promise<MembershipDisplay> {
  if (!userId) return membershipFromSubscription(null);
  return membershipFromSubscription(await new SupabaseConsumerSubscriptionRepository().getByUser(userId));
}
