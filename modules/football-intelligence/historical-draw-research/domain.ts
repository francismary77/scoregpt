import type { BacktestPrediction } from "@/modules/football-backtesting/domain";

export interface StructuralDrawFeatures {
  goalDifferenceVolatility: number | null;
  volatilitySimilarity: number | null;
  closeGameRate: number | null;
  decisiveGameRate: number | null;
  scorelineConcentration: number | null;
  lowDrawConcentration: number | null;
  oneGoalConcentration: number | null;
  recentDrawRate5: number | null;
  drawRecencySupport: number | null;
  recentDecisiveMargin: number | null;
  scoringVariance: number | null;
  attackDefenceBalanceSimilarity: number | null;
  expectedScorelineConcentration: number | null;
  lowTotalBalanceShape: number | null;
  venueAsymmetry: number | null;
}

export interface StructuralEvidenceCounts { homeOverall: number; awayOverall: number; homeVenue: number; awayVenue: number; recentHome: number; recentAway: number }
export interface StructuralFeatureRow { league: string; fixtureId: string; kickoffAt: string; actualDraw: boolean; prediction: BacktestPrediction; features: StructuralDrawFeatures; evidence: StructuralEvidenceCounts; existing: { drawProbability: number; homeAwayGap: number; strengthSimilarity: number; expectedGoalGap: number | null } }
export type StructuralFeatureKey = keyof StructuralDrawFeatures;
export interface DrawLikeThresholds { gapMaximum: number; drawProbabilityMinimum: number; strengthSimilarityMinimum: number; expectedGoalGapMaximum: number }
