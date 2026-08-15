if (typeof window !== "undefined") throw new Error("Customer billing is restricted to the server runtime.");
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireServiceRoleSupabaseConfig } from "../../lib/supabase/server-environment.ts";
import { parsePaymentEnvironment } from "./foundation.ts";
import type { BusinessSetupOrder, ConsumerSubscription, ManagedPlatformBilling, PaymentEnvironment } from "./domain";

export interface CustomerBillingSnapshot { subscription: ConsumerSubscription | null; orders: Array<{ order: BusinessSetupOrder; managed: ManagedPlatformBilling | null }> }
const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? "");

export class CustomerBillingRepository {
  private db: SupabaseClient;
  private environment: PaymentEnvironment;
  constructor(env: NodeJS.ProcessEnv = process.env, client?: SupabaseClient) {
    this.environment = parsePaymentEnvironment(env.PAYSTACK_ENVIRONMENT);
    const { url, serviceRoleKey } = requireServiceRoleSupabaseConfig(env);
    this.db = client ?? createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  async getForUser(userId: string): Promise<CustomerBillingSnapshot> {
    if (!userId) throw new Error("authentication_required");
    const [subResult, orderResult] = await Promise.all([
      this.db.from("consumer_subscriptions").select("*").eq("user_id", userId).eq("environment", this.environment).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      this.db.from("orders").select("*").eq("user_id", userId).eq("payment_purpose", "business_setup").eq("payment_environment", this.environment).order("created_at", { ascending: false }),
    ]);
    if (subResult.error || orderResult.error) throw new Error("customer_billing_read_failed");
    const subscription = subResult.data ? this.subscription(subResult.data) : null;
    const orders: CustomerBillingSnapshot["orders"] = [];
    for (const row of orderResult.data ?? []) {
      const { data, error } = await this.db.from("managed_platform_billings").select("*").eq("setup_order_id", row.id).eq("provider_environment", this.environment).maybeSingle();
      if (error) throw new Error("customer_billing_read_failed");
      orders.push({ order: this.order(row), managed: data ? this.managed(data) : null });
    }
    return { subscription, orders };
  }
  private subscription(row: Record<string, unknown>): ConsumerSubscription { return { id: text(row, "id"), userId: text(row, "user_id"), billingCustomerId: text(row, "billing_customer_id"), productKey: "consumer-premium-monthly", priceId: text(row, "price_id"), providerId: "paystack", environment: parsePaymentEnvironment(text(row, "environment")), providerPlanReference: text(row, "provider_plan_reference"), providerCustomerReference: text(row, "provider_customer_reference"), initialPaymentReference: text(row, "initial_payment_reference"), providerSubscriptionReference: row.provider_subscription_reference ? text(row, "provider_subscription_reference") : undefined, amountMinor: Number(row.amount_minor), currency: "NGN", billingInterval: "monthly", status: row.status as ConsumerSubscription["status"], entitlementStatus: row.entitlement_status as ConsumerSubscription["entitlementStatus"], startedAt: row.started_at ? text(row, "started_at") : undefined, currentPeriodStart: row.current_period_start ? text(row, "current_period_start") : undefined, currentPeriodEnd: row.current_period_end ? text(row, "current_period_end") : undefined, nextBillingAt: row.next_billing_at ? text(row, "next_billing_at") : undefined, cancelledAt: row.cancelled_at ? text(row, "cancelled_at") : undefined, cancelAtPeriodEnd: Boolean(row.cancel_at_period_end), createdAt: text(row, "created_at"), updatedAt: text(row, "updated_at") }; }
  private order(row: Record<string, unknown>): BusinessSetupOrder { return { id: text(row, "id"), orderNumber: text(row, "order_number"), userId: text(row, "user_id"), buyer: { name: text(row, "buyer_name"), email: text(row, "buyer_email") }, packageId: text(row, "package_id") as "launch" | "business", purpose: "business_setup", environment: parsePaymentEnvironment(text(row, "payment_environment")), productKey: text(row, "product_key"), priceId: text(row, "price_snapshot_id"), standardAmountMinor: Number(row.standard_amount_minor), chargedAmountMinor: Number(row.amount_minor), currency: "NGN", promotionId: row.promotion_id ? text(row, "promotion_id") : undefined, businessTermsVersion: text(row, "business_terms_version"), refundPolicyVersion: text(row, "refund_policy_version"), acceptedAt: text(row, "terms_accepted_at"), paymentMethod: text(row, "payment_method") as "manual-bank" | "paystack", status: text(row, "order_status") as BusinessSetupOrder["status"], onboardingStatus: text(row, "onboarding_status") as BusinessSetupOrder["onboardingStatus"], manualPaymentStatus: row.manual_payment_status ? text(row, "manual_payment_status") as BusinessSetupOrder["manualPaymentStatus"] : undefined, manualConfirmedAt: row.manual_confirmed_at ? text(row, "manual_confirmed_at") : undefined, createdAt: text(row, "created_at"), updatedAt: text(row, "updated_at"), paidAt: row.paid_at ? text(row, "paid_at") : undefined, fulfillmentCount: Number(row.fulfillment_count) }; }
  private managed(row: Record<string, unknown>): ManagedPlatformBilling { return { id: text(row, "id"), setupOrderId: text(row, "setup_order_id"), ownerUserId: text(row, "owner_user_id"), packageId: text(row, "package_id") as "launch" | "business", productKey: text(row, "product_key") as ManagedPlatformBilling["productKey"], priceId: text(row, "price_snapshot_id"), amountMinor: Number(row.amount_minor), currency: "NGN", billingInterval: "monthly", includedPeriodStart: text(row, "included_period_start"), includedPeriodEnd: text(row, "included_period_end"), status: text(row, "billing_status") as ManagedPlatformBilling["status"], environment: parsePaymentEnvironment(text(row, "provider_environment")), cancelAtPeriodEnd: Boolean(row.cancel_at_period_end), createdAt: text(row, "created_at"), updatedAt: text(row, "updated_at") }; }
}
