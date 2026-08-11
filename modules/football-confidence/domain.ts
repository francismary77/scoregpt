import type { BacktestPrediction, MatchOutcome } from "@/modules/football-backtesting/domain";

export interface ConfidenceFeatures { maximumProbability: number; secondProbability: number; topMargin: number; topToBottomMargin: number; normalizedEntropy: number; concentration: number; selectedOutcome: MatchOutcome; minimumHistory: number; totalHistory: number; minimumVenue: number; recentSample: number; h2hSample: number; evidenceAgreement: number; absoluteStrengthDifference: number; expectedGoalDifference: number }
export interface ConfidenceObservation { prediction: BacktestPrediction; league: string; features: ConfidenceFeatures }
export interface ConfidenceCandidate { id: string; formula: string; score(features: ConfidenceFeatures): number }
export interface SelectiveMetrics { predictions: number; coverage: number; correct: number; accuracy: number | null; brierScore: number | null; logLoss: number | null; selections: Record<MatchOutcome, number>; actual: Record<MatchOutcome, number>; wilson95: { lower: number; upper: number } | null }
