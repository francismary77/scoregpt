import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return <><SiteHeader/><main className="football-experience-page"><section className="inner-hero"><div className="container"><span>404</span><h1>Fixture not found</h1><p>The requested football page is unavailable or has not been published.</p><Link className="button" href="/matches">Return to Match Centre</Link></div></section></main><SiteFooter/></>;
}
