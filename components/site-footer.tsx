import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><BrandMark /><p>Clearer football decisions, built on data and explained by AI.</p><span>© 2026 {brand.companyName}</span></div>
        <div><h3>Platform</h3><Link href="/matches">Today&apos;s Matches</Link><Link href="/results">Results</Link><Link href="/pricing">Pricing</Link></div>
        <div><h3>Company</h3><Link href="/about">About</Link><Link href="/sales">For Business</Link><a href={`mailto:${brand.supportEmail}`}>Contact</a></div>
        <div><h3>Legal</h3><Link href="/responsible-gaming">Responsible Gaming</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
      </div>
    </footer>
  );
}
