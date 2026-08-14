import { NextResponse } from "next/server";
import { normalizePaystackWebhook, SubscriptionLifecycleService, verifyPaystackWebhookSignature } from "@/modules/billing/paystack-webhooks";
import { SupabaseLifecycleRepository } from "@/modules/billing/webhook-repository";
import { resolveB2BPaystackWebhook } from "@/modules/billing/b2b-webhooks";
import { parsePaymentEnvironment } from "@/modules/billing/foundation";

export async function POST(request: Request) {
  const raw = await request.text(), signature = request.headers.get("x-paystack-signature") ?? undefined;
  try {
    if (process.env.PAYMENTS_ENABLED !== "true" || process.env.PAYMENT_PROVIDER !== "paystack") throw new Error("webhook_disabled");
    const environment = parsePaymentEnvironment(process.env.PAYSTACK_ENVIRONMENT);
    verifyPaystackWebhookSignature(raw, signature, process.env.PAYSTACK_SECRET_KEY ?? "", environment);
    const business = await resolveB2BPaystackWebhook(raw, undefined, environment);
    if (business) return NextResponse.json(business, { status: 200 });
    const event = normalizePaystackWebhook(raw, environment), result = await new SubscriptionLifecycleService(new SupabaseLifecycleRepository()).process(event);
    return NextResponse.json({ accepted: true, eventId: event.id, processed: result.processed }, { status: 200 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "webhook_rejected", clientError = ["missing_webhook_signature", "invalid_webhook_signature", "malformed_webhook_payload", "unsupported_webhook_event"].includes(code);
    return NextResponse.json({ accepted: false, error: clientError ? code : "webhook_rejected" }, { status: clientError ? 400 : 503 });
  }
}
