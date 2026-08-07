import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Contact", description: `Contact ${brand.siteName} and ${brand.companyName} for general, platform sales and support inquiries.` };

const contacts = [
  { label: "General inquiries", subject: "General ScoreGPT Inquiry", copy: "Questions about ScoreGPT, partnerships or the platform." },
  { label: "Platform sales", subject: "AI Football Platform Sales Inquiry", copy: "Discuss your own professionally branded AI football platform." },
  { label: "Technical support", subject: "ScoreGPT Technical Support", copy: "Support contact prepared for future registered members and clients." },
];

export default function ContactPage(){return <><SiteHeader/><main className="contact-page"><section className="inner-hero"><div className="orb orb-two"/><div className="container"><span className="eyebrow">Contact</span><h1>How can we help?</h1><p>Reach {brand.siteName} and {brand.companyName} for platform questions, business sales or support.</p></div></section><section className="section"><div className="container contact-grid">{contacts.map((item,index)=><article key={item.label}><span>0{index+1}</span><h2>{item.label}</h2><p>{item.copy}</p><a className="text-link" href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent(item.subject)}`}>Email us →</a></article>)}</div><div className="container contact-note"><div><span className="eyebrow">Company</span><h2>{brand.companyName}</h2><p>{brand.domain} · {brand.defaultCountry}</p></div><div><small>Primary contact</small><a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a><span>{brand.contactPhone}</span></div></div></section></main><SiteFooter/></>}
