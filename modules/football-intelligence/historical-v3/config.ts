export const HISTORICAL_V3_MODEL_VERSION = "historical-v3";

export interface HistoricalV3Parameters { name: string; venuePseudoMatches: number; overallWeight: number; minimumLambda: number; maximumLambda: number }

export const historicalV3Candidates: readonly HistoricalV3Parameters[] = [
  { name: "standard-venue", venuePseudoMatches: 0, overallWeight: 0, minimumLambda: .15, maximumLambda: 5 },
  { name: "overall-blend-3", venuePseudoMatches: 3, overallWeight: 1, minimumLambda: .15, maximumLambda: 5 },
  { name: "overall-blend-6", venuePseudoMatches: 6, overallWeight: 1, minimumLambda: .15, maximumLambda: 5 },
] as const;

export const historicalV3Parameters = historicalV3Candidates[2];
