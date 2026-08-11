import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { WhatsAppLink } from "./whatsapp-cta";

export function LegalDocument({ eyebrow, title, intro, updated = "12 August 2026", children }: { eyebrow: string; title: string; intro: string; updated?: string; children: ReactNode }) {
  return <><SiteHeader/><main className="legal-document"><section className="inner-hero"><div className="container"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p><small>Last updated: {updated}</small></div></section><section className="section"><div className="container legal-document-body">{children}<aside className="legal-contact"><h2>Questions?</h2><p>Contact FABRO TECH LIMITED through our official WhatsApp channel.</p><WhatsAppLink label="Contact us on WhatsApp"/></aside><p className="legal-cross-links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/responsible-gaming">Responsible Use</Link><Link href="/business-terms">Business Terms</Link><Link href="/refund-policy">Refund Policy</Link></p></div></section></main><SiteFooter/></>;
}
