import Link from "next/link";

const capabilities = [
  "AI-powered football predictions",
  "Membership and subscription system",
  "Managed hosting",
  "Football data integration",
  "Payment integration",
  "Professional responsive website",
];

export function BusinessOffer() {
  return (
    <section className="business-section" aria-labelledby="business-title">
      <div className="container business-inner">
        <div className="business-copy">
          <span className="eyebrow">For football business owners</span>
          <h2 id="business-title">Build Your Own AI Football Prediction Brand</h2>
          <p>Launch a professional AI-powered football platform built around your brand, your audience and your business — without starting from zero.</p>
          <div className="business-actions">
            <Link href="/sales" className="button">View Business Packages <span>→</span></Link>
            <Link href="#today-matches" className="button button-ghost">See What You Can Own <span>↓</span></Link>
          </div>
        </div>
        <div className="business-detail">
          <div className="business-points"><span>Your brand.</span><span>Your domain.</span><span>Your subscribers.</span><span>Your pricing.</span></div>
          <ul>{capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
