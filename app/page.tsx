import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionHeading } from "@/components/section-heading";
import { MatchCard } from "@/components/match-card";
import { AnnouncementBar } from "@/components/announcement-bar";
import { BusinessOffer } from "@/components/business-offer";
import { brand } from "@/config/brand";
import { businessMarketing } from "@/config/marketing";
import { matches, metrics, results } from "@/data/mock-data";

const benefits = [
  ["01", "Data, not guesswork", "Current match data and statistical signals shape every analysis."],
  ["02", "Reasoning you can read", "Understand the factors behind each AI insight—not just the output."],
  ["03", "Calibrated confidence", "Every insight includes confidence and risk, so uncertainty stays visible."],
  ["04", "A public record", "Won, lost, and void outcomes remain visible to keep performance accountable."],
];

export default function Home() {
  return <div className="page-shell">
    <SiteHeader />
    <main>
      {brand.businessSalesMarketingEnabled && businessMarketing.announcementsEnabled && <AnnouncementBar announcements={businessMarketing.announcements} />}
      <section className="hero"><div className="orb orb-one" /><div className="orb orb-two" /><div className="grid-lines" /><div className="container hero-grid">
        <div className="hero-copy"><span className="eyebrow"><i /> AI-powered football predictions</span><h1>Smarter Football Predictions.<br/><em>Powered by AI.</em></h1><p>{brand.siteName} combines current football data, statistical analysis and AI reasoning to deliver smarter match predictions with clear confidence, risk and reasoning.</p><div className="hero-actions"><Link className="button" href="/register">Try Free Prediction <span>→</span></Link><Link className="button button-ghost" href="/matches">Explore today&apos;s matches</Link></div>{brand.businessSalesMarketingEnabled && <Link href="/sales" className="hero-business-link">Want your own platform? <span>→</span></Link>}<div className="trust-line"><span className="avatars">◉ ◉ ◉</span><span><b>Built for clarity</b><small>No guaranteed outcomes. Just better-informed decisions.</small></span></div></div>
        <div className="hero-card-wrap"><div className="hero-card-glow"/><article className="analysis-card"><div className="analysis-head"><span><i /> Featured AI intelligence</span><b>LIVE DEMO</b></div><div className="league-row"><span>Premier League</span><span>Today · 16:30 WAT</span></div><div className="fixture"><div><span className="team-badge red">A</span><strong>Arsenal</strong><small>Home</small></div><span className="versus">VS</span><div><span className="team-badge blue">C</span><strong>Chelsea</strong><small>Away</small></div></div><div className="analysis-stats"><div><small>AI confidence</small><b className="accent">78%</b></div><div><small>Risk level</small><b><span className="risk-dot"/> Medium</b></div><div><small>Suggested market</small><b>Home or draw</b></div></div><div className="reasoning"><div><span>✦</span><b>AI reasoning</b></div><p>Arsenal&apos;s recent home form and defensive consistency create an edge. Chelsea remain dangerous in transition, which keeps the risk profile balanced.</p></div><Link href="/matches" className="analysis-link">View full analysis <span>→</span></Link><p className="demo-note">Demonstration data · Not betting advice</p></article></div>
      </div></section>

      <section className="metrics"><div className="container metric-grid">{metrics.map((item, i)=><div key={item.label}><b>{item.value}</b><span>{item.label}</span>{i < metrics.length-1 && <i />}</div>)}</div><p className="demo-label">Demo metrics shown for product illustration</p></section>

      {brand.businessSalesMarketingEnabled && <BusinessOffer />}

      <section className="section matches-section" id="today-matches"><div className="container"><div className="heading-row"><SectionHeading eyebrow="Today's slate" title="Predictions for today’s matches" copy="A concise view of the fixtures our intelligence engine is currently analysing."/><Link href="/matches" className="text-link">View all matches →</Link></div><div className="cards-grid">{matches.map(m=><MatchCard key={m.id} match={m}/>)}</div></div></section>

      <section className="section process-section"><div className="container"><SectionHeading eyebrow="How it works" title="From raw data to clear intelligence" copy="A rigorous process designed to make football analysis easier to understand." align="center"/><div className="process-grid">{[["01","We pull football data","Form, fixtures, team performance and relevant match signals."],["02","Our engine analyses the match","Statistical patterns are evaluated and interpreted with AI."],["03","We publish transparent insight","You see the market, confidence, risk and reasoning together."]].map(([n,t,c],i)=><article key={n}><span className="step-icon">{i===0?"⌁":i===1?"✦":"◎"}</span><small>Step {n}</small><h3>{t}</h3><p>{c}</p>{i<2&&<b className="step-arrow">→</b>}</article>)}</div></div></section>

      <section className="section results-section"><div className="container results-layout"><div><SectionHeading eyebrow="Radical transparency" title="Every published result stays on the record." copy="Trust is built through accountability. We display wins, losses and void selections openly—without deleting inconvenient outcomes."/><Link href="/results" className="button button-ghost">Explore all results <span>→</span></Link></div><div className="results-card"><div className="results-head"><span>Recent results</span><small>Public record</small></div>{results.map(r=><div className="result-row" key={r.fixture}><span className={`state ${r.state.toLowerCase()}`}>{r.state === "Won" ? "✓" : r.state === "Lost" ? "×" : "–"}</span><div><b>{r.fixture}</b><small>{r.market}</small></div><strong>{r.score}</strong><em className={r.state.toLowerCase()}>{r.state}</em></div>)}<Link href="/results">View performance record →</Link></div></div></section>

      <section className="section why-section"><div className="container"><SectionHeading eyebrow="Why ScoreGPT" title="Intelligence designed for better judgement" align="center"/><div className="benefit-grid">{benefits.map(([n,t,c])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{c}</p></article>)}</div></div></section>

      <section className="section membership-section"><div className="container membership-layout"><div><SectionHeading eyebrow="Membership" title="Start free. Go deeper when you’re ready." copy="Explore daily match intelligence at no cost, then unlock a fuller view with Premium."/><p className="pricing-note">Final commercial pricing will be announced after the foundation phase.</p></div><div className="plans"><article><span>Free</span><h3>Essential intelligence</h3><p>For exploring how ScoreGPT works.</p><ul><li>Daily selected match insights</li><li>Basic confidence scores</li><li>Public results access</li></ul><Link href="/register" className="button button-ghost">Get started free</Link></article><article className="featured-plan"><span>Premium <b>COMING SOON</b></span><h3>Complete match intelligence</h3><p>For people who want the full picture.</p><ul><li>All daily match analyses</li><li>Detailed AI reasoning</li><li>Risk and confidence breakdowns</li></ul><Link href="/pricing" className="button">View membership <span>→</span></Link></article></div></div></section>

      {brand.businessSalesMarketingEnabled && <section className="closing-business-cta"><div className="container"><div><span className="eyebrow">Your next move</span><h2>Ready to Build Your Football Prediction Business?</h2><p>See our Launch and Business Editions.</p></div><Link href="/sales" className="button">View Business Packages <span>→</span></Link></div></section>}

      <section className="responsible"><div className="container"><span>!</span><div><h2>Play responsibly</h2><p>{brand.siteName} provides sports analysis and informational AI-generated insights, not guaranteed outcomes. Betting involves financial risk. Users must meet the legal gambling age applicable in their jurisdiction and should never wager money they cannot afford to lose.</p></div></div></section>
    </main><SiteFooter />
  </div>;
}
