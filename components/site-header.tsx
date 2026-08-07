import Link from "next/link";
import { BrandMark } from "./brand-mark";

const nav = [
  ["Today's Matches", "/matches"], ["Results", "/results"], ["Pricing", "/pricing"], ["About", "/about"],
  ["For Business", "/sales"],
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <BrandMark />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {nav.map(([label, href]) => <Link className={href === "/sales" ? "business-nav-link" : undefined} key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="login-link" href="/login">Log in</Link>
          <Link className="button button-small" href="/register">Get started <span>↗</span></Link>
        </div>
      </div>
    </header>
  );
}
