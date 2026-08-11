export const HISTORICAL_MODEL_VERSION = "historical-v1";

export interface HistoricalModelWeights {
  seasonPointsPerGame: number;
  seasonGoalDifference: number;
  seasonAttack: number;
  seasonDefence: number;
  recentPointsPerGame: number;
  recentWinRate: number;
  venuePointsPerGame: number;
  scoringRate: number;
  cleanSheetRate: number;
  h2hMaximumAdjustment: number;
}

export const historicalModelWeights: Readonly<HistoricalModelWeights> = {
  seasonPointsPerGame: 0.2,
  seasonGoalDifference: 0.12,
  seasonAttack: 0.1,
  seasonDefence: 0.1,
  recentPointsPerGame: 0.18,
  recentWinRate: 0.08,
  venuePointsPerGame: 0.15,
  scoringRate: 0.04,
  cleanSheetRate: 0.03,
  h2hMaximumAdjustment: 0.05,
};
