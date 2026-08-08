import { footballCompetitions } from "@/config/football-data";
import { getMatchCentreData, getResultsCentreData, intelligenceService } from "@/modules/intelligence/application";
import type { CompetitionSummary, FixtureDetail, FixtureSummary, FootballExperienceData, IntelligenceReportSummary, TeamSummary } from "./types";

const competitionSummaries: CompetitionSummary[] = footballCompetitions.map((item) => ({ id: item.id, name: item.name, country: item.country, logoUrl: null, season: item.currentSeason, enabled: item.enabled, featured: item.homepageFeatured, availability: item.enabled ? "rolling-out" : "planned", provenance: "demonstration" }));
const team = (value: { id: string; name: string; shortName: string }): TeamSummary => ({ ...value, logoUrl: null, country: null, provenance: "demonstration" });
function fixture(value: ReturnType<typeof getMatchCentreData>[number]): FixtureSummary {
  const competition = competitionSummaries.find((item) => item.id === value.competition.id) ?? { id: value.competition.id, name: value.competition.name, country: value.competition.country, logoUrl: null, season: value.competition.season, enabled: true, featured: false, availability: "rolling-out", provenance: "demonstration" };
  return { id: value.fixture.id, competition, kickoffAt: value.fixture.kickoff, displayKickoff: value.fixture.displayKickoff, status: value.fixture.status, homeTeam: team(value.fixture.homeTeam), awayTeam: team(value.fixture.awayTeam), homeScore: null, awayScore: null, venue: value.fixture.venue ?? null, provenance: "demonstration" };
}

export async function getDemoFootballExperience(): Promise<FootballExperienceData> {
  const matches = getMatchCentreData(), fixtures = matches.map(fixture), resultRows = getResultsCentreData();
  const reports: IntelligenceReportSummary[] = [];
  for (const item of matches.slice(0, 4)) { const report = await intelligenceService.getIntelligenceForFixture(item.fixture.id), summaryFixture = fixtures.find((entry) => entry.id === item.fixture.id)!; reports.push({ id: `demo-report-${item.fixture.id}`, fixture: summaryFixture, headline: `${item.fixture.homeTeam.name} vs ${item.fixture.awayTeam.name} intelligence`, excerpt: report.shortAnalysis, confidence: report.prediction.confidence.value, riskLevel: report.prediction.risk, recommendedMarket: report.recommendedMarket.prediction, accessLevel: report.prediction.accessLevel ?? "registered", published: true, provenance: "demonstration" }); }
  const results = resultRows.map(({ result }) => { const found = fixtures.find((item) => item.id === result.fixtureId); const [homeScore, awayScore] = result.scoreLabel.split("-").map((value) => Number.parseInt(value.trim(), 10)); const base = found ?? fixtures[0]; const resultFixture = { ...base, id: result.fixtureId, homeScore: Number.isFinite(homeScore) ? homeScore : null, awayScore: Number.isFinite(awayScore) ? awayScore : null, status: result.outcome === "pending" ? "scheduled" : "finished" }; return { fixture: resultFixture, date: result.publishedAt, status: resultFixture.status, provenance: "demonstration" as const }; });
  return { competitions: competitionSummaries, fixtures, results, reports, source: "demonstration", degraded: false };
}

export async function getDemoFixtureDetail(id: string): Promise<FixtureDetail | null> {
  const data = await getDemoFootballExperience(), summary = data.fixtures.find((item) => item.id === id); if (!summary) return null;
  const report = await intelligenceService.getIntelligenceForFixture(id);
  return { fixture: summary, report: data.reports.find((item) => item.fixture.id === id) ?? null, markets: report.markets.map((item) => ({ id: item.id, market: item.market, prediction: item.prediction, confidence: item.confidence.value, riskLevel: item.risk, reasoning: item.reasoning })), sections: ["form", "h2h", "standings", "injuries", "lineups", "statistics", "odds"].map((category) => ({ category, available: category === "form" || category === "h2h" || category === "statistics", payload: null, provenance: "demonstration" })) };
}
