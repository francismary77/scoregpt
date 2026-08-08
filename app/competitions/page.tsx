import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompetitionGrid } from "@/components/competition-grid";
import { createFootballExperienceService } from "@/modules/football-experience/application";
import { getSiteUrl } from "@/config/site";

export const metadata: Metadata = { title: "Football Competitions", description: "Explore the planned 30-league football intelligence footprint of 9ja Football AI as coverage rolls out competition by competition.", alternates: { canonical: `${getSiteUrl()}/competitions` }, openGraph: { title: "Football Competitions | 9ja Football AI", description: "Built for 30 top football leagues and competitions, with coverage rolling out gradually.", url: `${getSiteUrl()}/competitions`, images: ["/og.png"] } };

export default async function CompetitionsPage() {
  const data = await (await createFootballExperienceService()).getExperience();
  return <><SiteHeader/><main className="football-experience-page"><section className="inner-hero"><div className="orb orb-one"/><div className="container"><span className="eyebrow">Competition footprint</span><h1>Built for 30 Top Football Leagues &amp; Competitions</h1><p>Live coverage is rolling out competition by competition. Planned entries are not presented as currently live.</p></div></section><section className="section"><div className="container"><CompetitionGrid competitions={data.competitions}/></div></section></main><SiteFooter/></>;
}
