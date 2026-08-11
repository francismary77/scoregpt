import type { ShadowPredictionRecord } from "./domain";

const compare = (a: ShadowPredictionRecord, b: ShadowPredictionRecord) => (a.rankingDate.localeCompare(b.rankingDate)) || ((a.rankingPosition ?? Number.MAX_SAFE_INTEGER) - (b.rankingPosition ?? Number.MAX_SAFE_INTEGER)) || (b.confidenceScoreInternal - a.confidenceScoreInternal) || a.providerFixtureId.localeCompare(b.providerFixtureId, undefined, { numeric: true });

/** Operational cohort bounding only. It never recalculates tiers, confidence or rankings. */
export function selectBoundedShadowCohort(records: readonly ShadowPredictionRecord[], maximum = 10): ShadowPredictionRecord[] {
  const limit = Math.max(0, Math.min(20, Math.floor(maximum))), unique = [...new Map(records.map((row) => [row.providerFixtureId, row])).values()], eligible = unique.filter((row) => row.publishingTierCalculated !== "LIMITED_EVIDENCE").sort(compare), selected: ShadowPredictionRecord[] = [];
  const take = (row: ShadowPredictionRecord | undefined) => { if (row && selected.length < limit && !selected.some((item) => item.providerFixtureId === row.providerFixtureId)) selected.push(row); };
  for (const row of eligible.filter((item) => item.publishingTierCalculated === "TOP_PICK")) take(row);
  const represented = new Set(selected.map((row) => row.providerCompetitionId));
  for (const competition of [...new Set(eligible.map((row) => row.providerCompetitionId))].sort()) { if (!represented.has(competition)) { const row = eligible.find((item) => item.providerCompetitionId === competition); take(row); if (row) represented.add(competition); } }
  const dates = new Set(selected.map((row) => row.rankingDate));
  for (const date of [...new Set(eligible.map((row) => row.rankingDate))].sort()) if (!dates.has(date)) { take(eligible.find((row) => row.rankingDate === date)); dates.add(date); }
  for (const row of eligible) take(row);
  return selected.sort(compare);
}

export function cohortGate(records: readonly ShadowPredictionRecord[], maximum = 10) {
  const competitions = new Set(records.map((row) => row.providerCompetitionId));
  return { passed: records.length >= 4 && records.length <= Math.min(20, maximum) && competitions.size >= 2, predictionCount: records.length, competitionCount: competitions.size };
}
