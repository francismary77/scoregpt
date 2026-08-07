import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionHeading } from "@/components/section-heading";
import { BusinessInquiryForm } from "@/components/business-inquiry-form";
import { brand } from "@/config/brand";
import { businessPackages, formatNaira, founderOffer, platformCare } from "@/config/pricing";

export const metadata: Metadata = { title: "Build Your AI Football Prediction Platform", description: `Launch a professionally branded AI football prediction platform with ${brand.companyName}.` };

const comparison = [
  ["Development time", "Often months of coordination", "A faster, guided launch"],
  ["AI integration", "Sourced and managed separately", "Included within the managed platform"],
  ["Football data", "Separate provider setup", "Configured as part of delivery"],
  ["Hosting & deployment", "Multiple technical decisions", "Managed setup and deployment"],
  ["Maintenance & security", "Ongoing internal responsibility", "Covered through Platform Care"],
  ["Updates & support", "Separate vendors or retainers", "One managed relationship"],
];

const onboarding = ["Choose your package", "Submit your brand details", "Your domain is connected", `${brand.companyName} configures and deploys your platform`, "Testing and handover", "Launch"];

export default function SalesPage() {
  return <div className="commercial-page"><SiteHeader/><main>
    <section className="sales-hero"><div className="orb orb-one"/><div className="grid-lines"/><div className="container sales-hero-grid"><div><span className="eyebrow">For football creators and entrepreneurs</span><h1>Build Your Own AI Football Prediction Brand</h1><p>Launch a professional AI-powered football prediction platform built around your brand, your audience and your business — without starting from zero.</p><div className="hero-actions"><a className="button" href="#inquiry">Start Your Platform <span>→</span></a><Link className="button button-ghost" href="/#today-matches">See ScoreGPT in Action</Link></div></div><div className="sales-hero-card"><span>Professionally configured for you</span>{["Your brand","Your domain","Your subscribers","Your pricing"].map(item=><b key={item}>✓ {item}</b>)}<small>Managed by {brand.companyName}</small></div></div></section>

    <section className="founder-offer"><div className="container"><div><span className="eyebrow">Limited launch opportunity</span><h2>{founderOffer.label}</h2><p>{founderOffer.disclaimer}</p></div><div className="offer-prices">{businessPackages.map(item=><div key={item.id}><span>{item.name}</span><del>{formatNaira(item.standardPrice)}</del><b>{formatNaira(item.founderPrice)}</b></div>)}</div></div></section>

    <section className="section package-section" id="packages"><div className="container"><SectionHeading eyebrow="Business packages" title="Choose the platform that fits your ambition" copy="Both editions are professionally configured around your business, audience and identity." align="center"/><div className="business-package-grid">{businessPackages.map((item,index)=><article key={item.id} className={index===1?"business-package featured-business-package":"business-package"}><div className="package-head"><span>{item.name}</span>{index===1&&<em>Business</em>}<h2>{item.audience}</h2><div><del>{formatNaira(item.standardPrice)}</del><b>{formatNaira(item.founderPrice)}</b><small>Founder price</small></div></div><ul>{item.features.map(feature=><li key={feature}>{feature}</li>)}</ul>{"capabilityNote" in item&&<p className="capability-note">{item.capabilityNote}</p>}<div className="care-price"><span>Platform Care after 12 months</span><b>{formatNaira(item.platformCareMonthly)}/month</b></div><a className={index===1?"button":"button button-ghost"} href="#inquiry">Choose {item.name} <span>→</span></a></article>)}</div></div></section>

    <section className="section care-section"><div className="container care-layout"><div><SectionHeading eyebrow="Ongoing platform care" title="A managed platform—not another technical burden." copy="After the first 12 months, Platform Care keeps the essential technology around your business operating and maintained."/><p className="care-exclusion">{platformCare.exclusions}</p></div><div className="care-grid">{platformCare.includes.map((item,index)=><div key={item}><span>{String(index+1).padStart(2,"0")}</span><b>{item}</b></div>)}</div></div></section>

    <section className="section comparison-section"><div className="container"><SectionHeading eyebrow="A more direct route" title="Why not build everything from scratch?" copy="Bring the moving parts together through one professionally managed solution." align="center"/><div className="comparison-table" role="table" aria-label="Custom development and ScoreGPT-powered platform comparison"><div className="comparison-row comparison-head" role="row"><b>Area</b><b>Custom Development</b><b>ScoreGPT-powered Platform</b></div>{comparison.map(([area,custom,managed])=><div className="comparison-row" role="row" key={area}><strong>{area}</strong><span>{custom}</span><span>{managed}</span></div>)}</div></div></section>

    <section className="section onboarding-section"><div className="container"><SectionHeading eyebrow="Simple onboarding" title="From your idea to launch" copy="A clear process with FABRO TECH LIMITED managing the technical setup." align="center"/><div className="onboarding-grid">{onboarding.map((item,index)=><article key={item}><span>{index+1}</span><h3>{item}</h3>{index<onboarding.length-1&&<i>→</i>}</article>)}</div></div></section>

    <section className="section inquiry-section" id="inquiry"><div className="container"><SectionHeading eyebrow="Start a conversation" title="Tell us about your football brand" copy="Share the essentials below, or contact our platform sales team directly."/><BusinessInquiryForm/></div></section>
  </main><SiteFooter/></div>;
}
