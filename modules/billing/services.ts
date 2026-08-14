import type { PaymentProvider } from "./providers";
import type { OrderCustomer, PaymentMethod, PaymentStatus, PlatformSetupOrder } from "./domain";
import type { PlatformOrderRepository } from "./repositories";
import { businessPaymentConfig } from "@/config/payment";
import { businessPackages } from "@/config/pricing";

export class PaymentService {
  private providers: Map<string, PaymentProvider>;
  private activeProviderId: string;
  constructor(providers: Map<string, PaymentProvider>, activeProviderId: string) { this.providers = providers; this.activeProviderId = activeProviderId; }
  getPaymentMethods(): PaymentMethod[] {
    const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true";
    const environment = process.env.PAYSTACK_ENVIRONMENT;
    const safePaystack = paymentsEnabled && process.env.PAYMENT_PROVIDER === "paystack" && (environment === "test" || environment === "live") && process.env.PAYSTACK_SECRET_KEY?.startsWith(environment === "live" ? "sk_live_" : "sk_test_");
    return businessPaymentConfig.methods.map((item) => ({ id: item.id, providerId: item.id, type: item.id === "manual-bank" ? "bank-transfer" : "card", label: item.label, enabled: paymentsEnabled && (item.id === "manual-bank" || (item.id === "paystack" && Boolean(safePaystack))), availability: paymentsEnabled && (item.id === "manual-bank" || (item.id === "paystack" && safePaystack)) ? "available" : item.availability }));
  }
  getActiveProvider() { const provider = this.providers.get(this.activeProviderId); if (!provider) throw new Error("Configured payment provider is unavailable."); return provider; }
  getProvider(id: string) { const provider = this.providers.get(id); if (!provider) throw new Error("Payment provider is unavailable."); return provider; }
}

export class PlatformOrderService {
  private repository: PlatformOrderRepository;
  private payments: PaymentService;
  constructor(repository: PlatformOrderRepository, payments: PaymentService) { this.repository = repository; this.payments = payments; }
  async prepareOrder(packageId: string, customer: OrderCustomer): Promise<PlatformSetupOrder> {
    const selected = businessPackages.find((item) => item.id === packageId);
    if (!selected) throw new Error("Platform package not found.");
    const now = new Date().toISOString(), order: PlatformSetupOrder = { id: `mock-order-${packageId}`, packageId, packageName: selected.name, customer, total: { amount: selected.founderPrice, currency: "NGN" }, status: "pending-payment", paymentProviderId: this.payments.getActiveProvider().id, createdAt: now, updatedAt: now };
    await this.repository.saveOrder(order);
    await this.payments.getActiveProvider().createPayment({ orderId: order.id, amount: order.total, description: `${selected.name} platform setup`, customer });
    return order;
  }
  getOrders() { return this.repository.getOrders(); }
  getPendingTransfers() { return this.repository.getOrdersByStatus("payment-submitted"); }
  updateStatus(id: string, status: PaymentStatus) { return this.repository.updateStatus(id, status); }
}
