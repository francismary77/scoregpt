import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountView } from "@/components/member-pages";
import { CustomerBilling } from "@/components/customer-billing";
import { requireServerUser } from "@/modules/account/server";
import { CustomerBillingRepository, type CustomerBillingSnapshot } from "@/modules/billing/customer-billing";
import { paymentsEnabled } from "@/modules/billing/runtime-config";
import { membershipFromSubscription } from "@/modules/account/membership-resolver";
import { createServerPersistenceRepositories } from "@/modules/persistence/server";
import { entitlementConfig } from "@/config/application";

export const metadata: Metadata = { title: "Your Account" };
export default async function Page() {
  const user = await requireServerUser("/account");
  const billingAvailable = paymentsEnabled();
  const billing: CustomerBillingSnapshot = billingAvailable ? await new CustomerBillingRepository().getForUser(user.id) : { subscription: null, orders: [] };
  const membership = membershipFromSubscription(billing.subscription);
  const remaining = membership.hasPremiumAccess ? null : await (await createServerPersistenceRepositories()).predictionUsage.getRemainingAllowance(user.id, entitlementConfig.freePredictionAllowance);
  return <><SiteHeader/><main className="member-page"><div className="container"><AccountView state={{membership,remaining}}/>{billingAvailable ? <CustomerBilling snapshot={billing}/> : <section className="customer-billing"><div className="member-welcome"><div><span className="eyebrow">Billing</span><h2>Subscriptions and platform orders</h2><p>Billing is not currently available. Your account and free access remain available.</p></div></div></section>}</div></main><SiteFooter/></>;
}
