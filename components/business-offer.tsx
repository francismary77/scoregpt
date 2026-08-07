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
          <div className="platform-preview" aria-label="Illustrative branded football platform preview">
            <div className="preview-top"><span><i>P</i> PitchIQ</span><small>Brand preview</small></div>
            <div className="preview-body"><div className="preview-sidebar"><i/><i/><i/></div><div className="preview-content"><span>Today&apos;s intelligence</span><div className="preview-fixture"><b>City</b><em>VS</em><b>United</b></div><div className="preview-meter"><i/></div><div className="preview-stats"><span>AI confidence <b>81%</b></span><span>Risk <b>Low</b></span></div></div></div>
          </div>
          <div className="business-points"><span>Your brand.</span><span>Your domain.</span><span>Your subscribers.</span><span>Your pricing.</span></div>
          <ul>{capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
