import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MatchCentre } from "@/components/match-centre";
import { competitionService, getMatchCentreData } from "@/modules/intelligence/application";

export const metadata: Metadata = { title: "Demo Match Centre", description: "Explore structured demonstration fixtures with AI prediction, confidence, risk and explainable reasoning." };
export default function MatchesPage(){const items=getMatchCentreData();const competitions=competitionService.getSupported();return <><SiteHeader/><main className="match-centre-page"><section className="inner-hero intelligence-inner-hero"><div className="orb orb-one"/><div className="container"><span className="eyebrow">Football intelligence · Demo mode</span><h1>Match Centre</h1><p>Explore structured demonstration fixtures with transparent predictions, confidence, risk and detailed analysis. No information on this page is live.</p><div className="demo-banner"><i/> Mock data environment <span>Live football data is not connected</span></div></div></section><section className="section"><div className="container"><MatchCentre items={items} competitions={competitions}/></div></section></main><SiteFooter/></>}
