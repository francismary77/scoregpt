import type { FootballExperienceRepository, PersistedFootballRows } from "./repository";
import { getDemoFixtureDetail, getDemoFootballExperience } from "./fallback";
import type { CompetitionSummary, FixtureDetail, FixtureSummary, FootballExperienceData, IntelligenceReportSummary, TeamSummary } from "./types";

function excerpt(value: unknown): string | null { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const item = value as Record<string, unknown>; for (const key of ["summary", "shortAnalysis", "headline"]) if (typeof item[key] === "string") return item[key] as string; return null; }
function mapRows(rows: PersistedFootballRows): FootballExperienceData {
  const fixtureCounts = new Map<string, number>(); rows.fixtures.forEach((item) => fixtureCounts.set(item.competition_id, (fixtureCounts.get(item.competition_id) ?? 0) + 1));
  const competitions: CompetitionSummary[] = rows.competitions.map((item, index) => ({ id: item.id, name: item.name, country: item.country ?? "", logoUrl: null, season: item.season, enabled: item.enabled, featured: index < 5, availability: "available", fixtureCount: fixtureCounts.get(item.id) ?? 0, provenance: item.is_demo ? "demonstration" : "persisted" }));
  const competitionMap = new Map(competitions.map((item) => [item.id, item])), teamMap = new Map<string, TeamSummary>(rows.teams.map((item) => [item.id, { id: item.id, name: item.name, shortName: item.short_name, logoUrl: item.logo_url, country: item.country, provenance: item.is_demo ? "demonstration" : "persisted" }]));
  const fixtures: FixtureSummary[] = rows.fixtures.flatMap((item) => { const competition = competitionMap.get(item.competition_id), homeTeam = teamMap.get(item.home_team_id), awayTeam = teamMap.get(item.away_team_id); if (!competition || !homeTeam || !awayTeam) return []; return [{ id: item.id, competition, kickoffAt: item.kickoff_at, displayKickoff: new Date(item.kickoff_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }), status: item.status, homeTeam, awayTeam, homeScore: item.home_score, awayScore: item.away_score, venue: null, provenance: item.is_demo ? "demonstration" : "persisted" }]; });
  const fixtureMap = new Map(fixtures.map((item) => [item.id, item]));
  const reports: IntelligenceReportSummary[] = rows.reports.flatMap((item) => { const fixture = fixtureMap.get(item.fixture_id); if (!fixture) return []; return [{ id: item.id, fixture, headline: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} intelligence`, excerpt: item.reasoning ?? excerpt(item.analysis), confidence: item.confidence, riskLevel: item.risk_level, recommendedMarket: item.recommended_market, accessLevel: item.access_level, published: item.status === "published", provenance: item.is_demo ? "demonstration" : "persisted" }]; });
  const results = fixtures.filter((item) => item.status === "finished" || item.status === "cancelled").map((fixture) => ({ fixture, date: fixture.kickoffAt, status: fixture.status, provenance: fixture.provenance }));
  return { competitions, fixtures, results, reports, source: fixtures.some((item) => item.provenance === "persisted") ? "persisted" : "demonstration", degraded: false };
}

export class FootballExperienceService {
  constructor(private readonly repository: FootballExperienceRepository | null) {}
  async getExperience(): Promise<FootballExperienceData> {
    const demo = await getDemoFootballExperience(); if (!this.repository) return { ...demo, reports: demo.reports.filter((item) => item.accessLevel === "public") };
    try {
      const persisted = mapRows(await this.repository.read());
      const fixtures = persisted.fixtures.length >= 3 ? persisted.fixtures : [...persisted.fixtures, ...demo.fixtures.filter((item) => !persisted.fixtures.some((existing) => existing.id === item.id))];
      const results = persisted.results.length >= 2 ? persisted.results : [...persisted.results, ...demo.results.filter((item) => !persisted.results.some((existing) => existing.fixture.id === item.fixture.id))];
      const publicDemoReports = demo.reports.filter((item) => item.accessLevel === "public");
      const reports = persisted.reports.length ? persisted.reports : publicDemoReports;
      const competitions = persisted.competitions.length ? [...persisted.competitions, ...demo.competitions.filter((item) => !persisted.competitions.some((existing) => existing.name === item.name))] : demo.competitions;
      return { competitions, fixtures, results, reports, source: persisted.source, degraded: false };
    } catch { return { ...demo, reports: demo.reports.filter((item) => item.accessLevel === "public"), degraded: true }; }
  }
  async getFixture(id: string): Promise<FixtureDetail | null> {
    if (this.repository) try { const rows = await this.repository.read(), data = mapRows(rows), fixture = data.fixtures.find((item) => item.id === id); if (fixture) { const report = data.reports.find((item) => item.fixture.id === id) ?? null, reportMarkets = report ? rows.markets.filter((item) => item.intelligence_report_id === report.id).map((item) => ({ id: item.id, market: item.market_type, prediction: item.prediction, confidence: item.confidence, riskLevel: item.risk_level, reasoning: item.reasoning })) : []; const sections = ["form", "h2h", "standings", "injuries", "lineups", "statistics", "odds"].map((category) => { const snapshot = rows.snapshots.find((item) => item.fixture_id === id && item.data_type === category); return { category, available: Boolean(snapshot), payload: snapshot?.payload ?? null, provenance: snapshot ? snapshot.is_demo ? "demonstration" as const : "persisted" as const : null }; }); return { fixture, report, markets: reportMarkets, sections }; } } catch { /* use safe fallback */ }
    return getDemoFixtureDetail(id);
  }
}
