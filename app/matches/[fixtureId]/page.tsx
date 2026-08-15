import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DataProvenanceLabel } from "@/components/data-provenance";
import { DisplayState } from "@/components/display-state";
import { StoredIntelligenceReport } from "@/components/stored-intelligence-report";
import { createFootballExperienceService } from "@/modules/football-experience/application";
import { getServerUser } from "@/modules/account/server";
import { createServerPersistenceRepositories } from "@/modules/persistence/server";
import { entitlementConfig } from "@/config/application";
import { getSiteUrl } from "@/config/site";
import { unlockStoredReport } from "./actions";
import { resolveConsumerMembership } from "@/modules/account/membership-resolver";
import { createPrivilegedFootballExperienceService } from "@/modules/football-experience/privileged";

export async function generateMetadata({ params }: { params: Promise<{ fixtureId: string }> }): Promise<Metadata> {
  const { fixtureId } = await params;
  const detail = await (await createFootballExperienceService()).getFixture(fixtureId);
  if (!detail) return { title: "Match unavailable" };
  const title = `${detail.fixture.homeTeam.name} vs ${detail.fixture.awayTeam.name} Football Intelligence`;
  return { title, description: `Fixture information and available intelligence for ${detail.fixture.homeTeam.name} vs ${detail.fixture.awayTeam.name}.`, alternates: { canonical: `${getSiteUrl()}/matches/${fixtureId}` }, openGraph: { title, url: `${getSiteUrl()}/matches/${fixtureId}`, images: ["/og.png"] } };
}

export default async function FixturePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const user = await getServerUser();
  const membership = user ? await resolveConsumerMembership(user.id) : null;
  const detail = await (membership?.hasPremiumAccess ? createPrivilegedFootballExperienceService() : await createFootballExperienceService()).getFixture(fixtureId);
  if (!detail) notFound();
  const { fixture, report, markets, sections } = detail;
  let reportAllowed = report?.accessLevel === "public", canUnlock = false, remaining: number | null = null;
  if (report && report.accessLevel !== "public" && user) {
    const repositories = await createServerPersistenceRepositories();
    if (membership?.hasPremiumAccess) reportAllowed = true;
    else if (report.accessLevel === "registered") {
      const usage = await repositories.predictionUsage.getUsageForUser(user.id);
      const viewed = usage.viewedFixtureIds.includes(fixture.id);
      remaining = Math.max(0, entitlementConfig.freePredictionAllowance - usage.used);
      reportAllowed = viewed;
      canUnlock = !viewed && remaining > 0;
    }
  }
  const unlock = unlockStoredReport.bind(null, fixture.id);
  return <><SiteHeader/><main className="fixture-experience-page">
    <section className="fixture-detail-hero"><div className="grid-lines"/><div className="container"><div className="fixture-detail-meta"><span>{fixture.competition.name}</span><span className={`match-status ${fixture.status}`}>{fixture.status}</span><DataProvenanceLabel source={fixture.provenance}/></div><time dateTime={fixture.kickoffAt}>{fixture.displayKickoff}</time><div className="fixture-detail-teams"><div><i>{fixture.homeTeam.shortName ?? fixture.homeTeam.name.slice(0, 3)}</i><h1>{fixture.homeTeam.name}</h1></div><strong>{fixture.homeScore !== null || fixture.awayScore !== null ? <>{fixture.homeScore ?? "–"}<small>:</small>{fixture.awayScore ?? "–"}</> : "VS"}</strong><div><i>{fixture.awayTeam.shortName ?? fixture.awayTeam.name.slice(0, 3)}</i><h1>{fixture.awayTeam.name}</h1></div></div><p>{fixture.venue ?? "Venue information will appear when available."}</p></div></section>
    <section className="section"><div className="container fixture-data-layout"><div className="fixture-data-main"><h2>Football data</h2><div className="rich-data-grid">{sections.map((section) => <article className={section.available ? "available" : ""} key={section.category}><span>{section.category}</span><h3>{section.available ? `${section.category[0].toUpperCase() + section.category.slice(1)} available` : `${section.category[0].toUpperCase() + section.category.slice(1)} will appear when available`}</h3><p>{section.available ? (section.provenance === "demonstration" ? "Sample context is included in the demonstration intelligence." : "Persisted information is available for this fixture.") : "No stored information is currently available. Missing data is not treated as zero."}</p>{section.provenance && <DataProvenanceLabel source={section.provenance}/>}</article>)}</div></div>
      <aside className="fixture-intelligence-panel"><h2>Match intelligence</h2>{!report ? <DisplayState title="No published report available" copy="Intelligence will appear after an eligible report is published."/> : reportAllowed ? <StoredIntelligenceReport report={report} markets={markets}/> : canUnlock ? <form action={unlock} className="report-server-gate"><h3>Member intelligence ready</h3><p>Use one free prediction access to open this stored report. No live AI or football-provider request will occur.</p><b>{remaining} access remaining</b><button className="button">Unlock report</button></form> : <div className="report-server-gate"><h3>{user ? "Premium intelligence" : "Create an account to continue"}</h3><p>{user ? "Upgrade to Premium to view this report." : "Registered and Premium reports are excluded from this page response until access is verified."}</p><Link className="button" href={user ? "/pricing" : `/login?next=${encodeURIComponent(`/matches/${fixture.id}`)}`}>{user ? "View Premium" : "Log in"}</Link></div>}</aside>
    </div></section><div className="container report-back"><Link href="/matches" className="text-link">← Back to Match Centre</Link></div>
  </main><SiteFooter/></>;
}
