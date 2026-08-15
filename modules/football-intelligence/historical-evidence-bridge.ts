import { isCompletedFixture, type HistoricalDataset, type HistoricalFixture } from "@/modules/football-data/historical";

export const MINIMUM_TEAM_EVIDENCE = 5;

export interface TeamEvidenceAudit {
  teamId: string;
  currentSeasonAvailable: number;
  currentSeasonUsed: number;
  previousSeasonAvailable: number;
  previousSeasonUsed: number;
  totalUsed: number;
  eligible: boolean;
  exclusionReason: "INSUFFICIENT_SAME_LEAGUE_HISTORY" | null;
  fixtureIds: string[];
}

const chronological = (a: HistoricalFixture, b: HistoricalFixture) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
const belongsTo = (fixture: HistoricalFixture, teamId: string) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId;

export function selectSeasonSpanningTeamEvidence(fixtures: readonly HistoricalFixture[], teamId: string, minimum = MINIMUM_TEAM_EVIDENCE): TeamEvidenceAudit {
  const completed = fixtures.filter((fixture) => isCompletedFixture(fixture) && belongsTo(fixture, teamId)).sort(chronological);
  const current = completed.filter((fixture) => fixture.evidence?.source !== "previous-season");
  const previous = completed.filter((fixture) => fixture.evidence?.source === "previous-season");
  const deficit = Math.max(0, minimum - current.length);
  const selectedPrevious = deficit ? previous.slice(-deficit) : [];
  const selected = [...current, ...selectedPrevious].sort(chronological);
  return { teamId, currentSeasonAvailable: current.length, currentSeasonUsed: current.length, previousSeasonAvailable: previous.length, previousSeasonUsed: selectedPrevious.length, totalUsed: selected.length, eligible: selected.length >= minimum, exclusionReason: selected.length >= minimum ? null : "INSUFFICIENT_SAME_LEAGUE_HISTORY", fixtureIds: selected.map((fixture) => fixture.id) };
}

export function buildSeasonSpanningEvidenceDataset(dataset: HistoricalDataset, homeTeamId: string, awayTeamId: string, minimum = MINIMUM_TEAM_EVIDENCE) {
  const home = selectSeasonSpanningTeamEvidence(dataset.fixtures, homeTeamId, minimum);
  const away = selectSeasonSpanningTeamEvidence(dataset.fixtures, awayTeamId, minimum);
  const selectedIds = new Set([...home.fixtureIds, ...away.fixtureIds]);
  return { dataset: { ...dataset, fixtures: dataset.fixtures.filter((fixture) => selectedIds.has(fixture.id)).sort(chronological) }, home, away };
}
