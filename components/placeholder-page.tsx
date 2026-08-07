import Link from "next/link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
export function PlaceholderPage({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <><SiteHeader /><main className="placeholder"><div className="orb orb-one" /><div className="container"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p><div className="placeholder-card"><span>Foundation preview</span><h2>This experience is being prepared.</h2><p>The full functionality will arrive in a later build. The route, shared design system, and responsive foundation are ready.</p></div><Link href="/" className="text-link">← Back to homepage</Link></div></main><SiteFooter /></>;
}
