import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FootballFixtureCard } from "@/components/football-fixture-card";
import { DataProvenanceLabel } from "@/components/data-provenance";
import { DisplayState } from "@/components/display-state";
import { createFootballExperienceService } from "@/modules/football-experience/application";
import { footballCompetitions } from "@/config/football-data";
import { getSiteUrl } from "@/config/site";

const configuredCompetition = (id: string) => footballCompetitions.find((item) => item.id === id);

export async function generateMetadata({ params }: { params: Promise<{ competitionId: string }> }): Promise<Metadata> {
  const { competitionId } = await params;
  const data = await (await createFootballExperienceService()).getExperience();
  const configured = configuredCompetition(competitionId);
  const competition = data.competitions.find((item) => item.id === competitionId || item.name === configured?.name);
  const name = competition?.name ?? configured?.name;
  return name ? { title: name, description: `Fixtures, results and available intelligence for ${name} on 9ja Football AI.`, alternates: { canonical: `${getSiteUrl()}/competitions/${competitionId}` } } : { title: "Competition unavailable" };
}

export default async function CompetitionPage({ params }: { params: Promise<{ competitionId: string }> }) {
  const { competitionId } = await params;
  const data = await (await createFootballExperienceService()).getExperience();
  const configured = configuredCompetition(competitionId);
  const competition = data.competitions.find((item) => item.id === competitionId || item.name === configured?.name);
  if (!competition && !configured) notFound();
  const name = competition?.name ?? configured!.name;
  const fixtures = data.fixtures.filter((item) => item.competition.id === competition?.id || item.competition.name === name);
  const upcoming = fixtures.filter((item) => !["finished", "cancelled"].includes(item.status));
  const results = fixtures.filter((item) => ["finished", "cancelled"].includes(item.status));
  const reports = data.reports.filter((item) => item.fixture.competition.id === competition?.id || item.fixture.competition.name === name);
  const availability = competition?.availability ?? (configured?.enabled ? "rolling-out" : "planned");
  const country = competition?.country ?? configured!.country;
  const season = competition?.season ?? null;
  return <><SiteHeader/><main className="football-experience-page"><section className="inner-hero"><div className="container"><span className={`availability ${availability}`}>{availability.replace("-", " ")}</span><h1>{name}</h1><p>{country}{season ? ` · ${season}` : ""}</p>{competition&&<DataProvenanceLabel source={competition.provenance}/>}</div></section><section className="section"><div className="container competition-detail-sections"><section><h2>Upcoming matches</h2>{upcoming.length ? <div className="football-fixture-grid">{upcoming.map((item) => <FootballFixtureCard fixture={item} key={item.id}/>)}</div> : <DisplayState title="No upcoming fixtures available" copy="Upcoming matches will appear when the schedule is available."/>}</section><section><h2>Recent results</h2>{results.length ? <div className="football-fixture-grid">{results.map((item) => <FootballFixtureCard fixture={item} key={item.id}/>)}</div> : <DisplayState title="No recent results available" copy="Completed fixtures will appear here when available."/>}</section><section><h2>Standings</h2><DisplayState title="Standings will appear when available" copy="No standings snapshot is currently available for this competition."/></section><section><h2>Latest intelligence</h2>{reports.length ? <div className="intelligence-preview-grid">{reports.map((item) => <article key={item.id}><span>{item.recommendedMarket ?? "Match intelligence"}</span><h3>{item.headline}</h3><p>{item.excerpt ?? "Open the match report for available intelligence."}</p></article>)}</div> : <DisplayState title="No published intelligence available" copy="Published reports for this competition will appear here."/>}</section></div></section></main><SiteFooter/></>;
}
