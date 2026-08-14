import Link from "next/link";
import { paymentsEnabled } from "@/modules/billing/runtime-config";
import { ConsumerSubscriptionCtaClient } from "./consumer-subscription-cta-client";
export function ConsumerSubscriptionCta() {
  if (!paymentsEnabled()) return <div className="consumer-checkout-cta"><p>Premium checkout is not currently available.</p><Link className="text-link" href="/contact">Contact us for updates</Link></div>;
  return <ConsumerSubscriptionCtaClient/>;
}
