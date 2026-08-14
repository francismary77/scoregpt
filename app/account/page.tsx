import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountView } from "@/components/member-pages";
import { CustomerBilling } from "@/components/customer-billing";
import { requireServerUser } from "@/modules/account/server";
import { CustomerBillingRepository, type CustomerBillingSnapshot } from "@/modules/billing/customer-billing";
import { paymentsEnabled } from "@/modules/billing/runtime-config";

export const metadata: Metadata = { title: "Your Account" };
export default async function Page() {
  const user = await requireServerUser("/account");
  const billingAvailable = paymentsEnabled();
  const billing: CustomerBillingSnapshot = billingAvailable ? await new CustomerBillingRepository().getForUser(user.id) : { subscription: null, orders: [] };
  return <><SiteHeader/><main className="member-page"><div className="container"><AccountView/>{billingAvailable ? <CustomerBilling snapshot={billing}/> : <section className="customer-billing"><div className="member-welcome"><div><span className="eyebrow">Billing</span><h2>Subscriptions and platform orders</h2><p>Billing is not currently available. Your account and free access remain available.</p></div></div></section>}</div></main><SiteFooter/></>;
}
