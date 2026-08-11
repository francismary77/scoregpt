import type { MatchAnalysisInput } from "@/modules/football-data/historical";
import { createHistoricalMatchIntelligence } from "../engine";
import type { MatchIntelligenceResult, ProbabilityTriple } from "../domain";
import { createHistoricalV2MatchIntelligence } from "./engine";
import { historicalV2Parameters, type HistoricalV2Parameters } from "./config";

export const HISTORICAL_V21_MODEL_VERSION = "historical-v2.1-research";

export interface HistoricalV21Parameters {
  id: string;
  temperature: number;
  drawAdjustmentScale: number;
  strengthGapDamping: number;
  expectedGoalGapDamping: number;
  lowEvidenceDamping: number;
  v2: HistoricalV2Parameters;
}

const variant = (id: string, changes: Partial<HistoricalV21Parameters> = {}, v2Changes: Partial<HistoricalV2Parameters> = {}): HistoricalV21Parameters => ({
  id,
  temperature: 1,
  drawAdjustmentScale: 1,
  strengthGapDamping: 0,
  expectedGoalGapDamping: 0,
  lowEvidenceDamping: 0,
  v2: { ...historicalV2Parameters, name: id, ...v2Changes },
  ...changes,
});

// Pre-declared low-dimensional research grid. The Batch 4H.11 baseline remains separate and unchanged.
export const historicalV21Candidates: readonly HistoricalV21Parameters[] = [
  variant("baseline-v2"),
  ...[.85, .9, .95, 1.05, 1.1, 1.15].map((temperature) => variant(`temperature-${temperature}`, { temperature })),
  ...[.6, .75, .9, 1.1].map((drawAdjustmentScale) => variant(`draw-shrink-${drawAdjustmentScale}`, { drawAdjustmentScale })),
  variant("strength-gate", { strengthGapDamping: .5 }),
  variant("expected-goal-gate", { expectedGoalGapDamping: .5 }),
  variant("evidence-gate", { lowEvidenceDamping: .5 }),
  variant("combined-gate", { strengthGapDamping: .35, expectedGoalGapDamping: .35, lowEvidenceDamping: .25 }),
  variant("low-goal-weaker", {}, { lowGoalsWeight: .15 }),
  variant("low-goal-stronger", {}, { lowGoalsWeight: .45 }),
  variant("score-closeness-weaker", {}, { expectedGoalClosenessWeight: .2 }),
  variant("score-closeness-stronger", {}, { expectedGoalClosenessWeight: .6 }),
  variant("strength-similarity-weaker", {}, { strengthProximityWeight: .5 }),
  variant("strength-similarity-stronger", {}, { strengthProximityWeight: .9 }),
  variant("draw-rate-shrunk", {}, { drawRatePriorStrength: 10, drawRatePrior: .25 }),
] as const;

// No candidate was accepted in Batch 4H.12. A future version must explicitly supply a separately frozen candidate.
export const historicalV21Parameters: HistoricalV21Parameters | null = null;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const normalize = (probabilities: ProbabilityTriple): ProbabilityTriple => {
  const total = probabilities.homeWin + probabilities.draw + probabilities.awayWin;
  return { homeWin: probabilities.homeWin / total, draw: probabilities.draw / total, awayWin: probabilities.awayWin / total };
};
const temperatureScale = (probabilities: ProbabilityTriple, temperature: number) => normalize({
  homeWin: probabilities.homeWin ** (1 / temperature),
  draw: probabilities.draw ** (1 / temperature),
  awayWin: probabilities.awayWin ** (1 / temperature),
});

export function createHistoricalV21MatchIntelligence(input: MatchAnalysisInput, parameters: HistoricalV21Parameters): MatchIntelligenceResult {
  const v1 = createHistoricalMatchIntelligence(input), signal = createHistoricalV2MatchIntelligence(input, parameters.v2);
  const strengthGap = clamp(Math.abs(v1.strength.differential) / .5);
  const expectedGap = v1.goalExpectation.expectedHomeGoals === null || v1.goalExpectation.expectedAwayGoals === null ? 0 : clamp(Math.abs(v1.goalExpectation.expectedHomeGoals - v1.goalExpectation.expectedAwayGoals) / 2);
  const minimumHistory = Math.min(input.homeTeam.profile.played, input.awayTeam.profile.played), minimumVenue = Math.min(input.homeTeam.relevantForm.played, input.awayTeam.relevantForm.played);
  const evidenceDeficit = 1 - (.65 * clamp(minimumHistory / 20) + .35 * clamp(minimumVenue / 10));
  const gate = (1 - parameters.strengthGapDamping * strengthGap) * (1 - parameters.expectedGoalGapDamping * expectedGap) * (1 - parameters.lowEvidenceDamping * evidenceDeficit);
  const draw = clamp(v1.probabilities.draw + (signal.probabilities.draw - v1.probabilities.draw) * parameters.drawAdjustmentScale * gate);
  const decisive = v1.probabilities.homeWin + v1.probabilities.awayWin, homeShare = decisive ? v1.probabilities.homeWin / decisive : .5;
  const probabilities = temperatureScale(normalize({ homeWin: (1 - draw) * homeShare, draw, awayWin: (1 - draw) * (1 - homeShare) }), parameters.temperature);
  return { ...signal, modelVersion: HISTORICAL_V21_MODEL_VERSION, probabilities };
}
