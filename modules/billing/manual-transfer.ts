if (typeof window !== "undefined") throw new Error("Manual payment confirmation is restricted to the server runtime.");
import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleSupabaseConfig } from "../../lib/supabase/server-environment.ts";
import { requirePaymentsEnabled } from "./runtime-config.ts";
import type { BusinessSetupOrder } from "./domain";

export interface ManualConfirmationInput { orderId: string; adminUserId: string; amountMinor: number; paymentReference: string; auditNote?: string }
export interface ManualConfirmationRepository { getOrder(orderId: string): Promise<BusinessSetupOrder | null>; confirm(input: ManualConfirmationInput): Promise<BusinessSetupOrder> }

export class ManualPaymentConfirmationService {
  private repository: ManualConfirmationRepository;
  constructor(repository: ManualConfirmationRepository) { this.repository = repository; }
  async confirm(input: ManualConfirmationInput) {
    if (!input.adminUserId) throw new Error("admin_required");
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || !/^[A-Za-z0-9 _./-]{6,120}$/.test(input.paymentReference)) throw new Error("invalid_manual_confirmation");
    const order = await this.repository.getOrder(input.orderId);
    if (!order || order.paymentMethod !== "manual-bank" || order.purpose !== "business_setup") throw new Error("invalid_manual_order");
    if (order.status === "paid") { if (order.manualPaymentStatus !== "confirmed") throw new Error("confirmation_conflict"); return order; }
    if (order.status !== "pending_payment" || order.manualPaymentStatus !== "awaiting_manual_confirmation") throw new Error("ineligible_manual_order");
    if (input.amountMinor !== order.chargedAmountMinor || order.currency !== "NGN") throw new Error("payment_validation_failed");
    return this.repository.confirm({ ...input, auditNote: input.auditNote?.trim().slice(0, 500) });
  }
}

export class SupabaseManualConfirmationRepository implements ManualConfirmationRepository {
  private db;
  private env: NodeJS.ProcessEnv;
  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
    const { url, serviceRoleKey } = requireServiceRoleSupabaseConfig(env);
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  async getOrder(orderId: string): Promise<BusinessSetupOrder | null> {
    const { data, error } = await this.db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (error) throw new Error("order_read_failed");
    if (!data) return null;
    return { id: String(data.id), orderNumber: String(data.order_number), userId: data.user_id ? String(data.user_id) : undefined, buyer: { name: String(data.buyer_name), email: String(data.buyer_email) }, packageId: data.package_id as BusinessSetupOrder["packageId"], purpose: "business_setup", productKey: String(data.product_key), priceId: String(data.price_snapshot_id), standardAmountMinor: Number(data.standard_amount_minor), chargedAmountMinor: Number(data.amount_minor), currency: "NGN", businessTermsVersion: String(data.business_terms_version), refundPolicyVersion: String(data.refund_policy_version), acceptedAt: String(data.terms_accepted_at), paymentMethod: data.payment_method as BusinessSetupOrder["paymentMethod"], status: data.order_status as BusinessSetupOrder["status"], onboardingStatus: data.onboarding_status as BusinessSetupOrder["onboardingStatus"], manualPaymentStatus: data.manual_payment_status as BusinessSetupOrder["manualPaymentStatus"] ?? undefined, manualConfirmedAt: data.manual_confirmed_at ?? undefined, manualConfirmedBy: data.manual_confirmed_by ?? undefined, createdAt: data.created_at, updatedAt: data.updated_at, paidAt: data.paid_at ?? undefined, fulfillmentCount: Number(data.fulfillment_count) };
  }
  async confirm(input: ManualConfirmationInput) {
    requirePaymentsEnabled(this.env);
    const { data, error } = await this.db.rpc("confirm_manual_business_setup_payment", { p_order_id: input.orderId, p_admin_user_id: input.adminUserId, p_amount_minor: input.amountMinor, p_payment_reference: input.paymentReference, p_audit_note: input.auditNote ?? null });
    if (error) throw new Error("manual_confirmation_failed");
    const order = await this.getOrder(String(data ?? input.orderId));
    if (!order) throw new Error("order_not_found");
    return order;
  }
}
