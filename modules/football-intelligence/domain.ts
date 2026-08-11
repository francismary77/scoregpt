import type { DataCompleteness, MatchAnalysisInput } from "@/modules/football-data/historical";

export type IntelligenceConfidence = "low" | "moderate" | "strong";
export type FactorDirection = "supports_home" | "supports_away" | "supports_goals" | "limits_confidence" | "neutral";
export type FactorStrength = "slight" | "moderate" | "strong";

export interface IntelligenceFactor {
  type: string;
  context: "home" | "away" | "match" | "h2h" | "data";
  direction: FactorDirection;
  strength: FactorStrength;
  summary: string;
}

export interface ProbabilityTriple { homeWin: number; draw: number; awayWin: number }
export interface GoalMarketProbabilities { over15: number | null; over25: number | null; over35: number | null; bttsYes: number | null; bttsNo: number | null }
export interface GoalExpectation { expectedHomeGoals: number | null; expectedAwayGoals: number | null; expectedTotalGoals: number | null; methodology: "historical-scoring-conceding-rates" | "historical-poisson-goal-distribution" }
export interface IntelligenceDataQuality { classification: DataCompleteness; confidence: IntelligenceConfidence; historicalSampleSize: number; recentSampleSize: number; homeVenueSampleSize: number; awayVenueSampleSize: number; h2hSampleSize: number; latestDataDate: string | null }

export interface MatchIntelligenceResult {
  modelVersion: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  probabilities: ProbabilityTriple;
  goalMarkets: GoalMarketProbabilities;
  goalExpectation: GoalExpectation;
  strength: { home: number; away: number; differential: number };
  confidence: IntelligenceConfidence;
  dataQuality: IntelligenceDataQuality;
  supportingFactors: IntelligenceFactor[];
}

export type MatchIntelligenceEngine = (input: MatchAnalysisInput) => MatchIntelligenceResult;
