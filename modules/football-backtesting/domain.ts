import type { HistoricalFixture } from "@/modules/football-data/historical";
import type { IntelligenceConfidence, ProbabilityTriple } from "@/modules/football-intelligence";

export type MatchOutcome = "home" | "draw" | "away";
export type GoalMarketKey = "over15" | "over25" | "over35" | "bttsYes" | "bttsNo";
export interface BacktestOptions { minimumPriorMatches?: number; recentN?: number; marketThreshold?: number }
export interface BacktestPrediction {
  fixture: HistoricalFixture; homeTeamName: string; awayTeamName: string; probabilities: ProbabilityTriple;
  predictedOutcome: MatchOutcome; actualOutcome: MatchOutcome; correct: boolean; confidence: IntelligenceConfidence; modelVersion: string;
  goalMarkets: Record<GoalMarketKey, number | null>; expectedGoals: { home: number | null; away: number | null; total: number | null };
  evidence: { priorFixtureIds: string[]; homeHistoricalMatches: number; awayHistoricalMatches: number; historicalSampleSize: number; recentSampleSize: number; h2hSampleSize: number; homeVenueSampleSize: number; awayVenueSampleSize: number; latestDataDate: string | null; strengthDifferential: number; directionalFactors: number; agreeingFactors: number };
}
export interface AccuracyMetric { predictions: number; correct: number; accuracy: number | null }
export interface ProbabilityMetric extends AccuracyMetric { brierScore: number | null; logLoss: number | null }
export interface CalibrationBucket { label: string; minimum: number; maximum: number; predictions: number; averageProbability: number | null; observedRate: number | null; calibrationGap: number | null; lowSample: boolean }
export interface GoalMarketEvaluation extends ProbabilityMetric { threshold: number; averageProbability: number | null; observedRate: number | null; calibration: CalibrationBucket[] }
export interface BaselineEvaluation { name: string; methodology: string; predictions: number; topPickAccuracy: number | null; multiclassBrierScore: number | null; logLoss: number | null }
export interface DiagnosticPrediction { fixtureId: string; match: string; kickoffAt: string; predictedOutcome: MatchOutcome; actualOutcome: MatchOutcome; predictedProbability: number; confidence: IntelligenceConfidence; expectedTotalGoals: number | null; actualTotalGoals: number; absoluteGoalError: number | null }
export interface TeamEvaluation { teamId: string; teamName: string; predictions: number; correct: number; accuracy: number | null; brierScore: number | null }
export interface BacktestReport {
  modelVersion: string; options: Required<BacktestOptions>;
  dataset: { totalFixtures: number; completedFixtures: number; eligibleFixtures: number; skippedFixtures: number; skippedReasons: Record<string, number>; earliestFixture: string | null; latestFixture: string | null };
  predictions: BacktestPrediction[];
  oneXTwo: { overall: AccuracyMetric; multiclassBrierScore: number | null; logLoss: number | null; byPick: Record<MatchOutcome, AccuracyMetric>; actualResults: Record<MatchOutcome, number> };
  calibration: CalibrationBucket[];
  confidence: Record<IntelligenceConfidence, ProbabilityMetric>;
  goalMarkets: Record<GoalMarketKey, GoalMarketEvaluation>;
  goalExpectation: { predictions: number; homeMae: number | null; awayMae: number | null; totalMae: number | null };
  baselines: BaselineEvaluation[];
  teams: TeamEvaluation[];
  diagnostics: { strongestCorrect: DiagnosticPrediction[]; strongestIncorrect: DiagnosticPrediction[]; highConfidenceFailures: DiagnosticPrediction[]; lowConfidenceSuccesses: DiagnosticPrediction[]; largestGoalErrors: DiagnosticPrediction[] };
}
