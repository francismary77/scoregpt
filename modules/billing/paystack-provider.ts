if (typeof window !== "undefined") throw new Error("Paystack credentials are restricted to the server runtime.");
import type { ConsumerSubscriptionVerification, InitializePaymentInput, PaymentEnvironment, ProviderPaymentResult } from "./domain";
import type { ConsumerSubscriptionProvider, PaymentGatewayProvider } from "./providers";

const SAFE_BASE = "https://api.paystack.co";
type PaystackEnvelope = { status?: unknown; message?: unknown; data?: unknown };

export function assertPaystackNetworkSafety(env: NodeJS.ProcessEnv) {
  if (env.PAYMENTS_ENABLED !== "true") throw new Error("payments_disabled");
  if (env.PAYMENT_PROVIDER !== "paystack") throw new Error("wrong_payment_provider");
  const configuredEnvironment = env.PAYSTACK_ENVIRONMENT;
  if (configuredEnvironment !== "test" && configuredEnvironment !== "live") throw new Error("paystack_environment_required");
  const environment: PaymentEnvironment = configuredEnvironment;
  const prefix = environment === "live" ? "sk_live_" : "sk_test_", secret = env.PAYSTACK_SECRET_KEY;
  if (!secret || !secret.startsWith(prefix) || !new RegExp(`^${prefix}[A-Za-z0-9_-]{8,}$`).test(secret)) throw new Error("valid_paystack_secret_required");
  if ((env.PAYSTACK_API_BASE_URL ?? SAFE_BASE) !== SAFE_BASE) throw new Error("invalid_paystack_base_url");
  return { secret, baseUrl: SAFE_BASE, environment };
}
export function assertPaystackTestNetworkSafety(env: NodeJS.ProcessEnv) { const value = assertPaystackNetworkSafety(env); if (value.environment !== "test") throw new Error("paystack_test_environment_required"); return value; }

const envelope = (value: unknown): PaystackEnvelope => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("malformed_provider_response"); return value as PaystackEnvelope; };
const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("malformed_provider_response"); return value as Record<string, unknown>; };
const optionalObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === "string" && value ? value : null;
const integer = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;

export class PaystackProvider implements PaymentGatewayProvider, ConsumerSubscriptionProvider {
  readonly id = "paystack";
  readonly environment: PaymentEnvironment;
  private readonly env: NodeJS.ProcessEnv;
  private readonly fetcher: typeof fetch;
  private readonly callbackUrl?: string;
  constructor(env: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch, callbackUrl?: string) {
    this.env = env;
    this.fetcher = fetcher;
    this.callbackUrl = callbackUrl;
    this.environment = assertPaystackNetworkSafety(env).environment;
  }
  private async request(path: string, init?: RequestInit) {
    const { secret, baseUrl } = assertPaystackNetworkSafety(this.env); let response: Response;
    try { response = await this.fetcher(`${baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(15000) }); } catch { throw new Error("paystack_network_error"); }
    let body: unknown; try { body = await response.json(); } catch { throw new Error("malformed_provider_response"); }
    const parsed = envelope(body); if (!response.ok || parsed.status !== true) throw new Error(response.status >= 500 ? "paystack_server_error" : "paystack_request_rejected"); return parsed.data ?? {};
  }
  private async call(path: string, init?: RequestInit) { return object(await this.request(path, init)); }
  async initialize(request: InitializePaymentInput): Promise<ProviderPaymentResult> {
    if (request.environment !== this.environment || request.providerId !== "paystack") throw new Error("provider_environment_mismatch");
    const data = await this.call("/transaction/initialize", { method: "POST", body: JSON.stringify({ email: request.customerEmail, amount: request.expectedAmountMinor, currency: request.currency, reference: request.reference, callback_url: this.callbackUrl, metadata: request.metadata }) });
    const authorizationUrl = string(data.authorization_url), reference = string(data.reference); if (!authorizationUrl || reference !== request.reference) throw new Error("invalid_provider_response");
    return { providerId: "paystack", environment: this.environment, reference, state: "initialized", amountMinor: request.expectedAmountMinor, currency: request.currency, authorizationUrl };
  }
  async verify(reference: string): Promise<ProviderPaymentResult> {
    const data = await this.call(`/transaction/verify/${encodeURIComponent(reference)}`), providerReference = string(data.reference), currency = string(data.currency), customer = optionalObject(data.customer), metadata = optionalObject(data.metadata), customerEmail = string(customer.email);
    const trustedMetadata = Object.fromEntries(["order_id", "product_key", "price_id"].flatMap(key => { const value = string(metadata[key]); return value ? [[key, value]] : []; }));
    if (!providerReference || typeof data.amount !== "number" || !currency || typeof data.status !== "string") throw new Error("invalid_provider_response");
    return { providerId: "paystack", environment: this.environment, reference: providerReference, state: data.status === "success" ? "succeeded" : "failed", amountMinor: data.amount, currency, ...(customerEmail ? { customerEmail } : {}), ...(Object.keys(trustedMetadata).length ? { metadata: trustedMetadata } : {}) };
  }
  async ensureCustomer(userId: string, email: string) { if (!userId || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("invalid_customer_request"); const data = await this.call("/customer", { method: "POST", body: JSON.stringify({ email, metadata: { application_user_id: userId } }) }), providerCustomerReference = string(data.customer_code); if (!providerCustomerReference) throw new Error("invalid_provider_customer"); return { providerCustomerReference }; }
  async initializeSubscription(input: Parameters<ConsumerSubscriptionProvider["initializeSubscription"]>[0]) {
    if (input.amountMinor !== 300000 || input.currency !== "NGN" || input.billingInterval !== "monthly" || input.productKey !== "consumer-premium-monthly") throw new Error("invalid_subscription_catalogue");
    const plan = this.env.PAYSTACK_CONSUMER_MONTHLY_PLAN_CODE; if (!plan || plan !== input.providerPlanReference || !/^PLN_[A-Za-z0-9]+$/.test(plan)) throw new Error("trusted_plan_required");
    const data = await this.call("/transaction/initialize", { method: "POST", body: JSON.stringify({ email: input.email, amount: input.amountMinor, currency: input.currency, reference: input.reference, plan, callback_url: this.callbackUrl, metadata: { application_user_id: input.userId, product_key: input.productKey, provider_customer_reference: input.providerCustomerReference, provider_plan_reference: plan } }) });
    const authorizationUrl = string(data.authorization_url), reference = string(data.reference); if (!authorizationUrl || reference !== input.reference) throw new Error("invalid_provider_response"); return { reference, authorizationUrl };
  }
  async verifySubscription(reference: string): Promise<ConsumerSubscriptionVerification> {
    const data = await this.call(`/transaction/verify/${encodeURIComponent(reference)}`), metadata = optionalObject(data.metadata), customer = optionalObject(data.customer), plan = optionalObject(data.plan), providerReference = string(data.reference), providerCustomerReference = string(customer.customer_code), providerPlanReference = string(plan.plan_code) ?? string(metadata.provider_plan_reference), userId = string(metadata.application_user_id), productKey = string(metadata.product_key), providerSubscriptionReference = string(data.subscription_code);
    if (!providerReference || typeof data.amount !== "number" || !string(data.currency) || !providerCustomerReference || !providerPlanReference || !userId || !productKey) throw new Error("invalid_provider_response");
    return { reference: providerReference, providerId: "paystack", environment: this.environment, status: data.status === "success" ? "success" : "failed", amountMinor: data.amount, currency: String(data.currency), providerCustomerReference, providerPlanReference, ...(providerSubscriptionReference ? { providerSubscriptionReference } : {}), userId, productKey };
  }
  private subscription(value: Record<string, unknown>, expectedCustomer?: string, expectedPlan?: string): ConsumerSubscriptionVerification {
    const customer = object(value.customer), plan = object(value.plan), reference = string(value.subscription_code), customerReference = string(customer.customer_code), planReference = string(plan.plan_code), amount = integer(value.amount ?? plan.amount), currency = string(value.currency ?? plan.currency);
    if (!reference || !/^SUB_[A-Za-z0-9]+$/.test(reference) || !customerReference || !planReference || (expectedCustomer && customerReference !== expectedCustomer) || (expectedPlan && planReference !== expectedPlan) || !amount || !currency) throw new Error("invalid_provider_response");
    return { reference, providerId: "paystack", environment: this.environment, status: value.status === "active" ? "success" : "failed", amountMinor: amount, currency, providerCustomerReference: customerReference, providerPlanReference: planReference, providerSubscriptionReference: reference, userId: "", productKey: "", periodStart: string(value.createdAt ?? value.created_at) ?? undefined, periodEnd: string(value.next_payment_date) ?? undefined, nextBillingAt: string(value.next_payment_date) ?? undefined };
  }
  async getSubscription(reference: string) { if (!/^SUB_[A-Za-z0-9]+$/.test(reference)) throw new Error("invalid_provider_subscription_identity"); const result = this.subscription(await this.call(`/subscription/${encodeURIComponent(reference)}`)); if (result.reference !== reference) throw new Error("invalid_provider_response"); return result; }
  async findSubscriptions(input: { providerCustomerReference: string; providerPlanReference: string }) {
    if (!/^CUS_[A-Za-z0-9]+$/.test(input.providerCustomerReference) || !/^PLN_[A-Za-z0-9]+$/.test(input.providerPlanReference)) throw new Error("invalid_subscription_lookup_identity");
    const customer = await this.call(`/customer/${encodeURIComponent(input.providerCustomerReference)}`), plan = await this.call(`/plan/${encodeURIComponent(input.providerPlanReference)}`), customerId = integer(customer.id), planId = integer(plan.id);
    if (!customerId || !planId || string(customer.customer_code) !== input.providerCustomerReference || string(plan.plan_code) !== input.providerPlanReference) throw new Error("invalid_provider_response");
    const listed = await this.request(`/subscription?customer=${customerId}&plan=${planId}&perPage=100`); if (!Array.isArray(listed)) throw new Error("malformed_provider_response"); return listed.map(value => this.subscription(object(value), input.providerCustomerReference, input.providerPlanReference));
  }
  async cancelSubscription(providerSubscriptionReference: string) { const token = this.env.PAYSTACK_SUBSCRIPTION_EMAIL_TOKEN; if (!providerSubscriptionReference || !token) throw new Error("subscription_cancellation_token_required"); await this.call("/subscription/disable", { method: "POST", body: JSON.stringify({ code: providerSubscriptionReference, token }) }); return { status: "cancelled" as const, providerSubscriptionReference }; }
  async enableSubscription(providerSubscriptionReference: string) { const token = this.env.PAYSTACK_SUBSCRIPTION_EMAIL_TOKEN; if (!/^SUB_[A-Za-z0-9]+$/.test(providerSubscriptionReference) || !token) throw new Error("subscription_enable_token_required"); await this.call("/subscription/enable", { method: "POST", body: JSON.stringify({ code: providerSubscriptionReference, token }) }); return { status: "active" as const, providerSubscriptionReference }; }
}
export class PaystackTestProvider extends PaystackProvider {
  constructor(env: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch, callbackUrl?: string) {
    assertPaystackTestNetworkSafety(env);
    super(env, fetcher, callbackUrl);
  }
}

export function createConfiguredPaystackProvider(env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch) {
  let config: ReturnType<typeof assertPaystackNetworkSafety>; try { config = assertPaystackNetworkSafety(env); } catch { throw new Error("payments_not_safely_enabled"); }
  const site = (env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""); let url: URL; try { url = new URL(site); } catch { throw new Error("invalid_payment_callback_url"); }
  if (config.environment === "test" && (url.hostname === "9jafootballai.com.ng" || url.hostname === "www.9jafootballai.com.ng")) throw new Error("production_site_forbidden_in_test");
  if (config.environment === "live" && (url.protocol !== "https:" || url.origin !== "https://9jafootballai.com.ng")) throw new Error("production_site_required_for_live");
  return new PaystackProvider(env, fetcher, `${site}/payments/paystack/callback`);
}
