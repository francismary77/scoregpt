import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PlatformCheckout } from "@/components/platform-checkout";
import { businessPackages } from "@/config/pricing";
import { paymentService } from "@/modules/billing/application";

export const metadata: Metadata = { title: "Platform Setup Checkout", description: "Review your selected platform package and available payment methods." };
export function generateStaticParams() { return businessPackages.map((item) => ({ packageId: item.id })); }
export default async function Page({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params, selected = businessPackages.find((item) => item.id === packageId);
  if (!selected) notFound();
  const methods = paymentService.getPaymentMethods(), available = methods.some((method) => method.enabled);
  return <><SiteHeader/><main className="checkout-page"><section className="checkout-hero"><div className="container"><span className="eyebrow">Business platform enquiry</span><h1>{available ? "Complete your platform order." : "Payments are not currently available."}</h1><p>{available ? "Review your edition, choose an available payment method and follow the verification instructions." : "You can review this package, but no online or bank-transfer order can be created at this time."}</p></div></section><section className="section"><div className="container">{available ? <PlatformCheckout packageId={selected.id} packageName={selected.name} standardAmount={selected.standardPrice} amount={selected.founderPrice} managedPlatformMonthly={selected.managedPlatformMonthly} methods={methods}/> : <div className="bank-transfer-box"><span className="eyebrow">Checkout unavailable</span><h2>No payment action is available.</h2><p>Contact us if you would like to discuss this package. No order or payment record will be created.</p><a className="button button-ghost" href="/contact">Contact us</a></div>}</div></section></main><SiteFooter/></>;
}
