import type { ApiFootballCompetitionCandidate } from "@/modules/football-data/api-football-provider";
import type { NormalizedFixture, NormalizedTeam } from "@/modules/football-data/domain";
import type { HistoricalDataset, HistoricalFixture } from "@/modules/football-data/historical";
import type { ShadowFixtureSource, SupportedShadowCompetition } from "./shadow-pipeline";

export interface ActiveLeagueCandidate { priority: number; id: string; productName: string; providerName: string; country: string }
export const ACTIVE_LEAGUE_CANDIDATES: readonly ActiveLeagueCandidate[] = Object.freeze([
  { priority: 1, id: "swedish-allsvenskan", productName: "Swedish Allsvenskan", providerName: "Allsvenskan", country: "Sweden" },
  { priority: 2, id: "norwegian-eliteserien", productName: "Norwegian Eliteserien", providerName: "Eliteserien", country: "Norway" },
  { priority: 3, id: "finnish-veikkausliiga", productName: "Finnish Veikkausliiga", providerName: "Veikkausliiga", country: "Finland" },
  { priority: 4, id: "japanese-j1-league", productName: "Japanese J1 League", providerName: "J1 League", country: "Japan" },
  { priority: 5, id: "chinese-super-league", productName: "Chinese Super League", providerName: "Super League", country: "China" },
]);

export function verifyCandidateIdentity(candidate: ActiveLeagueCandidate, rows: readonly ApiFootballCompetitionCandidate[], now: string) {
  const exact = rows.filter((row) => row.name === candidate.providerName && row.country === candidate.country && row.type === "League");
  if (exact.length !== 1) return { ok: false as const, reason: exact.length ? "AMBIGUOUS_PROVIDER_IDENTITY" : "EXACT_PROVIDER_IDENTITY_NOT_FOUND" };
  const competition = exact[0], current = competition.seasons.filter((season) => season.current);
  if (current.length !== 1) return { ok: false as const, reason: current.length ? "AMBIGUOUS_CURRENT_SEASON" : "CURRENT_SEASON_NOT_FOUND" };
  const point = new Date(now).getTime(), start = new Date(`${current[0].start}T00:00:00Z`).getTime(), end = new Date(`${current[0].end}T23:59:59Z`).getTime();
  if (![point, start, end].every(Number.isFinite) || point < start || point > end) return { ok: false as const, reason: "CURRENT_DATE_OUTSIDE_PROVIDER_SEASON" };
  return { ok: true as const, competition, season: current[0] };
}

export function windowDates(now: string, hours: 72 | 168) {
  const start = new Date(now), end = new Date(start.getTime() + hours * 3_600_000);
  if (!Number.isFinite(start.getTime())) throw new Error("Discovery time must be a valid UTC timestamp.");
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), end: end.toISOString() };
}

export function eligibleFutureFixtures(fixtures: readonly NormalizedFixture[], competitionId: string, season: string, teamIds: ReadonlySet<string>, now: string, horizonEnd: string) {
  const start = new Date(now).getTime(), end = new Date(horizonEnd).getTime();
  return fixtures.filter((fixture) => fixture.competitionProviderId === competitionId && fixture.homeTeamProviderId !== fixture.awayTeamProviderId && teamIds.has(fixture.homeTeamProviderId) && teamIds.has(fixture.awayTeamProviderId) && fixture.status === "scheduled" && new Date(fixture.kickoffAt).getTime() > start && new Date(fixture.kickoffAt).getTime() <= end && Boolean(season));
}

export function previousCompletedSeason(competition: ApiFootballCompetitionCandidate, currentYear: string, now: string) {
  const cutoff = new Date(now).getTime();
  const eligible = competition.seasons.filter((season) => season.year !== currentYear && !season.current && Number.isFinite(new Date(`${season.end}T23:59:59Z`).getTime()) && new Date(`${season.end}T23:59:59Z`).getTime() < cutoff).sort((a, b) => Number(b.year) - Number(a.year));
  return eligible[0] ?? null;
}

export function buildInMemoryShadowSource(candidate: ActiveLeagueCandidate, competition: ApiFootballCompetitionCandidate, season: string, teams: readonly NormalizedTeam[], history: readonly NormalizedFixture[], upcoming: readonly NormalizedFixture[]): ShadowFixtureSource {
  const teamByProvider = new Map(teams.map((team) => [team.providerId, { id: team.providerId, providerId: team.providerId, name: team.name }]));
  for (const fixture of history) for (const providerId of [fixture.homeTeamProviderId, fixture.awayTeamProviderId]) if (!teamByProvider.has(providerId)) teamByProvider.set(providerId, { id: providerId, providerId, name: `Provider team ${providerId}` });
  const mapFixture = (fixture: NormalizedFixture): HistoricalFixture => ({ id: fixture.providerId, providerFixtureId: fixture.providerId, kickoffAt: fixture.kickoffAt, status: fixture.status, homeTeamId: fixture.homeTeamProviderId, awayTeamId: fixture.awayTeamProviderId, homeScore: fixture.homeScore, awayScore: fixture.awayScore });
  const dataset: HistoricalDataset = { competition: { id: candidate.id, providerId: competition.providerId, name: candidate.productName, country: competition.country, season }, teams: [...teamByProvider.values()], fixtures: history.map(mapFixture) };
  const supportedCompetition: SupportedShadowCompetition = { internalCompetitionId: candidate.id, providerCompetitionId: competition.providerId, name: candidate.productName, providerName: competition.name, country: competition.country, season, enabled: true };
  return { dataset, upcomingFixtures: upcoming.map(mapFixture), supportedCompetition };
}
