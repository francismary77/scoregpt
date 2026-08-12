import Link from "next/link";

const capabilities = [
  "AI-powered football predictions",
  "Membership and subscription system",
  "Managed Platform service",
  "30 Top Football Leagues & Competitions capability",
  "Payment integration",
  "Professional responsive website",
];

export function BusinessOffer() {
  return (
    <section className="business-section" aria-labelledby="business-title">
      <div className="container business-inner">
        <div className="business-copy">
          <span className="eyebrow">Built and supplied by FABRO TECH LIMITED</span>
          <h2 id="business-title">Own Your Own AI Football Intelligence Platform</h2>
          <p>Launch a branded football intelligence platform for your audience, community or sports business. We build, configure and deploy the technology while you focus on growing your brand and subscribers.</p>
          <div className="business-actions">
            <Link href="/sales" className="button">Own a Platform <span>→</span></Link>
            <Link href="/sales#packages" className="button button-ghost">View Business Packages <span>→</span></Link>
          </div>
        </div>
        <div className="business-detail">
          <div className="platform-preview" aria-label="Illustrative branded football platform preview">
            <div className="preview-top"><span><i>P</i> PitchIQ</span><small>Brand preview</small></div>
            <div className="preview-body"><div className="preview-sidebar"><i/><i/><i/></div><div className="preview-content"><span>Today&apos;s intelligence</span><div className="preview-fixture"><b>City</b><em>VS</em><b>United</b></div><div className="preview-meter"><i/></div><div className="preview-stats"><span>AI confidence <b>81%</b></span><span>Risk <b>Low</b></span></div></div></div>
          </div>
          <div className="business-points"><span>Your brand.</span><span>Your domain.</span><span>Your subscribers.</span><span>Your pricing.</span></div>
          <ul>{capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
          <small>Competition coverage is configurable and expands as competitions and provider services are enabled.</small>
        </div>
      </div>
    </section>
  );
}
