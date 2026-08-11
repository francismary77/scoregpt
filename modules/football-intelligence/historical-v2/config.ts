export const HISTORICAL_V2_MODEL_VERSION = "historical-v2";

export interface HistoricalV2Parameters {
  name: string; drawIntercept: number; strengthProximityWeight: number; expectedGoalClosenessWeight: number;
  lowGoalsWeight: number; drawPropensityWeight: number; balanceWeight: number; entropyWeight: number; interactionWeight: number;
  drawRatePriorStrength?: number; drawRatePrior?: number;
}

export const historicalV2Candidates: readonly HistoricalV2Parameters[] = [
  { name: "conservative", drawIntercept: -2.4, strengthProximityWeight: .7, expectedGoalClosenessWeight: .4, lowGoalsWeight: .3, drawPropensityWeight: .6, balanceWeight: .4, entropyWeight: .2, interactionWeight: .2 },
  { name: "balanced", drawIntercept: -2.1, strengthProximityWeight: .8, expectedGoalClosenessWeight: .5, lowGoalsWeight: .3, drawPropensityWeight: .7, balanceWeight: .4, entropyWeight: .2, interactionWeight: .2 },
  { name: "aggressive", drawIntercept: -1.8, strengthProximityWeight: .8, expectedGoalClosenessWeight: .5, lowGoalsWeight: .4, drawPropensityWeight: .8, balanceWeight: .5, entropyWeight: .3, interactionWeight: .2 },
  { name: "proximity", drawIntercept: -2.2, strengthProximityWeight: 1.2, expectedGoalClosenessWeight: .3, lowGoalsWeight: .2, drawPropensityWeight: .4, balanceWeight: .4, entropyWeight: .2, interactionWeight: .3 },
  { name: "goal-closeness", drawIntercept: -2.2, strengthProximityWeight: .4, expectedGoalClosenessWeight: 1, lowGoalsWeight: .5, drawPropensityWeight: .4, balanceWeight: .3, entropyWeight: .2, interactionWeight: .3 },
  { name: "draw-propensity", drawIntercept: -2.1, strengthProximityWeight: .5, expectedGoalClosenessWeight: .3, lowGoalsWeight: .3, drawPropensityWeight: 1.3, balanceWeight: .3, entropyWeight: .2, interactionWeight: .2 },
  { name: "probability-geometry", drawIntercept: -2.3, strengthProximityWeight: .4, expectedGoalClosenessWeight: .3, lowGoalsWeight: .2, drawPropensityWeight: .4, balanceWeight: 1, entropyWeight: .7, interactionWeight: .2 },
  { name: "low-goal-balance", drawIntercept: -2.2, strengthProximityWeight: .5, expectedGoalClosenessWeight: .4, lowGoalsWeight: .8, drawPropensityWeight: .4, balanceWeight: .7, entropyWeight: .2, interactionWeight: .5 },
  { name: "compact-interaction", drawIntercept: -2.25, strengthProximityWeight: .7, expectedGoalClosenessWeight: .5, lowGoalsWeight: .4, drawPropensityWeight: .6, balanceWeight: .5, entropyWeight: .25, interactionWeight: .5 },
  { name: "conservative-2.5", drawIntercept: -2.5, strengthProximityWeight: .7, expectedGoalClosenessWeight: .4, lowGoalsWeight: .3, drawPropensityWeight: .6, balanceWeight: .4, entropyWeight: .2, interactionWeight: .2 },
  { name: "conservative-2.6", drawIntercept: -2.6, strengthProximityWeight: .7, expectedGoalClosenessWeight: .4, lowGoalsWeight: .3, drawPropensityWeight: .6, balanceWeight: .4, entropyWeight: .2, interactionWeight: .2 },
  { name: "conservative-2.7", drawIntercept: -2.7, strengthProximityWeight: .7, expectedGoalClosenessWeight: .4, lowGoalsWeight: .3, drawPropensityWeight: .6, balanceWeight: .4, entropyWeight: .2, interactionWeight: .2 },
] as const;

// Frozen after early-70% development selection; do not alter from late-30% validation results.
export const historicalV2Parameters = historicalV2Candidates[9];
