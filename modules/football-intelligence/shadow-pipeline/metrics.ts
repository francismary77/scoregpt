import { wilsonInterval } from "@/modules/football-confidence/research";
import type { ShadowPredictionRecord } from "./domain";

const EPSILON = 1e-12;
const probability = (row: ShadowPredictionRecord, actual: "home" | "draw" | "away") => actual === "home" ? row.homeProbability : actual === "draw" ? row.drawProbability : row.awayProbability;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
export const forwardSampleLabel = (settled: number) => settled < 10 ? "VERY_LOW_SAMPLE" : settled < 30 ? "LOW_SAMPLE" : settled < 100 ? "EARLY_FORWARD_SAMPLE" : settled < 250 ? "DEVELOPING_SAMPLE" : "MATERIAL_FORWARD_SAMPLE";

export function shadowMetricGroup(rows: readonly ShadowPredictionRecord[]) {
  const settled = rows.filter((row) => row.settlementStatus === "SETTLED" && row.actualOutcome !== null);
  const correct = settled.filter((row) => row.predictionCorrect === true).length;
  return {
    predictions: rows.length,
    pending: rows.filter((row) => row.settlementStatus === "PENDING").length,
    settled: settled.length,
    correct,
    incorrect: settled.length - correct,
    accuracy: settled.length ? correct / settled.length : null,
    brierScore: average(settled.map((row) => (row.homeProbability - Number(row.actualOutcome === "home")) ** 2 + (row.drawProbability - Number(row.actualOutcome === "draw")) ** 2 + (row.awayProbability - Number(row.actualOutcome === "away")) ** 2)),
    logLoss: average(settled.map((row) => -Math.log(Math.max(EPSILON, probability(row, row.actualOutcome!))))),
    wilson95: settled.length ? wilsonInterval(correct, settled.length) : null,
    sampleLabel: forwardSampleLabel(settled.length),
    lowSample: settled.length < 30,
  };
}

export function calculateForwardShadowMetrics(rows: readonly ShadowPredictionRecord[]) {
  const mapGroups = (key: (row: ShadowPredictionRecord) => string) => Object.fromEntries([...new Set(rows.map(key))].sort().map((value) => [value, shadowMetricGroup(rows.filter((row) => key(row) === value))]));
  const topPicks = shadowMetricGroup(rows.filter((row) => row.isTopPickCalculated));
  return {
    epsilon: EPSILON,
    overall: shadowMetricGroup(rows),
    byTier: mapGroups((row) => row.publishingTierCalculated),
    byConfidence: mapGroups((row) => row.confidenceLabel),
    bySelection: mapGroups((row) => row.selectedOutcome),
    byCompetition: mapGroups((row) => row.competitionId),
    byPredictionDateUtc: mapGroups((row) => row.predictionCreatedAt.slice(0, 10)),
    byFixtureDateUtc: mapGroups((row) => row.kickoffAt.slice(0, 10)),
    byRun: mapGroups((row) => row.runId),
    topPicks: { ...topPicks, coverage: rows.length ? rows.filter((row) => row.isTopPickCalculated).length / rows.length : 0 },
  };
}
