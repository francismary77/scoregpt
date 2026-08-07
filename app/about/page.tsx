import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionHeading } from "@/components/section-heading";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "About", description: `Learn how ${brand.siteName} combines football data, statistical analysis and AI reasoning with transparent results.` };

const principles = [
  ["Data before opinion", "Match information and statistical signals provide the foundation for each analysis."],
  ["Reasoning stays visible", "Predictions include confidence, risk and an explanation of the factors considered."],
  ["Results remain public", "Won, lost and void outcomes stay on the performance record."],
  ["Uncertainty is honest", "Football remains unpredictable. ScoreGPT never presents analysis as a guaranteed outcome."],
];

export default function AboutPage(){return <><SiteHeader/><main className="about-page"><section className="inner-hero"><div className="orb orb-one"/><div className="container"><span className="eyebrow">About {brand.siteName}</span><h1>Building trust into football intelligence.</h1><p>{brand.siteName} is a professionally developed AI football intelligence platform by {brand.companyName}, designed to make match predictions clearer, more explainable and more accountable.</p></div></section><section className="section"><div className="container about-story"><div><SectionHeading eyebrow="Our approach" title="Football data interpreted with AI reasoning" copy="ScoreGPT brings current football information, statistical analysis and AI-generated explanations into one calm, professional experience."/><p>It is designed for people who want more context than an unexplained tip. Confidence and risk are presented alongside the prediction so users can understand uncertainty rather than ignore it.</p></div><div className="about-process"><span>Football data</span><i>→</i><span>Statistical analysis</span><i>→</i><span>AI reasoning</span><i>→</i><span>Transparent insight</span></div></div></section><section className="section about-principles"><div className="container"><SectionHeading eyebrow="What guides us" title="Intelligence with accountability" align="center"/><div className="principle-grid">{principles.map(([title,copy],index)=><article key={title}><span>0{index+1}</span><h2>{title}</h2><p>{copy}</p></article>)}</div></div></section><section className="section company-section"><div className="container"><div><span className="eyebrow">The company</span><h2>{brand.companyName}</h2><p>FABRO TECH LIMITED develops practical digital products and professionally branded AI football platforms for creators, communities and sports entrepreneurs.</p><Link href="/sales" className="button">Explore Business Platforms <span>→</span></Link></div><aside><h3>Responsible by design</h3><p>ScoreGPT provides informational sports analysis, not guaranteed outcomes. Betting involves financial risk and is only appropriate for adults who meet the legal gambling age in their jurisdiction.</p><Link href="/responsible-gaming" className="text-link">Read responsible gaming guidance →</Link></aside></div></section></main><SiteFooter/></>}
