import type { MatchAnalysisInput } from "@/modules/football-data/historical";
import { createHistoricalMatchIntelligence } from "../engine";
import type { IntelligenceConfidence, MatchIntelligenceResult, ProbabilityTriple } from "../domain";
import { HISTORICAL_V2_MODEL_VERSION, historicalV2Parameters, type HistoricalV2Parameters } from "./config";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Number(value.toFixed(4));
const rate = (draws: number, played: number) => played ? draws / played : 1 / 3;
const logistic = (value: number) => 1 / (1 + Math.exp(-value));
export interface HistoricalV2DrawFeatures { strengthProximity: number; expectedGoalCloseness: number; lowExpectedGoals: number; drawPropensity: number; drawEvidenceCount: number; probabilityBalance: number; normalizedEntropy: number; proximityLowGoalInteraction: number }

export function calculateHistoricalV2DrawFeatures(input: MatchAnalysisInput, v1Result = createHistoricalMatchIntelligence(input)): HistoricalV2DrawFeatures {
  const expectedHome = v1Result.goalExpectation.expectedHomeGoals, expectedAway = v1Result.goalExpectation.expectedAwayGoals, expectedTotal = v1Result.goalExpectation.expectedTotalGoals, probabilities = Object.values(v1Result.probabilities), entropy = -probabilities.reduce((sum, value) => sum + value * Math.log(Math.max(value, 1e-12)), 0) / Math.log(3);
  const overall = ((input.homeTeam.profile.drawPercentage ?? 1 / 3) + (input.awayTeam.profile.drawPercentage ?? 1 / 3)) / 2, recent = (rate(input.homeTeam.recent.draws, input.homeTeam.recent.played) + rate(input.awayTeam.recent.draws, input.awayTeam.recent.played)) / 2, venue = (rate(input.homeTeam.relevantForm.draws, input.homeTeam.relevantForm.played) + rate(input.awayTeam.relevantForm.draws, input.awayTeam.relevantForm.played)) / 2;
  const strengthProximity = 1 - clamp(Math.abs(v1Result.strength.differential) / .5), expectedGoalCloseness = expectedHome === null || expectedAway === null ? .5 : 1 - clamp(Math.abs(expectedHome - expectedAway) / 2), lowExpectedGoals = expectedTotal === null ? .5 : 1 - clamp(expectedTotal / 4), drawPropensity = (overall + recent + venue) / 3, probabilityBalance = 1 - clamp(Math.abs(v1Result.probabilities.homeWin - v1Result.probabilities.awayWin) / .7);
  const drawEvidenceCount = (input.homeTeam.profile.played + input.awayTeam.profile.played + input.homeTeam.recent.played + input.awayTeam.recent.played + input.homeTeam.relevantForm.played + input.awayTeam.relevantForm.played) / 6;
  return { strengthProximity, expectedGoalCloseness, lowExpectedGoals, drawPropensity, drawEvidenceCount, probabilityBalance, normalizedEntropy: entropy, proximityLowGoalInteraction: strengthProximity * lowExpectedGoals };
}

function confidence(input: MatchAnalysisInput, probabilities: ProbabilityTriple): IntelligenceConfidence { const maximum = Math.max(...Object.values(probabilities)), history = input.context.historicalSampleSize, venue = Math.min(input.homeTeam.relevantForm.played, input.awayTeam.relevantForm.played); return history >= 20 && venue >= 8 && maximum >= .55 ? "strong" : history >= 10 && venue >= 4 ? "moderate" : "low"; }

export function createHistoricalV2MatchIntelligence(input: MatchAnalysisInput, parameters: HistoricalV2Parameters = historicalV2Parameters): MatchIntelligenceResult {
  const v1 = createHistoricalMatchIntelligence(input), features = calculateHistoricalV2DrawFeatures(input, v1), priorStrength = parameters.drawRatePriorStrength ?? 0, priorRate = parameters.drawRatePrior ?? .25, drawPropensity = priorStrength ? (features.drawPropensity * features.drawEvidenceCount + priorStrength * priorRate) / (features.drawEvidenceCount + priorStrength) : features.drawPropensity, logit = parameters.drawIntercept + parameters.strengthProximityWeight * features.strengthProximity + parameters.expectedGoalClosenessWeight * features.expectedGoalCloseness + parameters.lowGoalsWeight * features.lowExpectedGoals + parameters.drawPropensityWeight * drawPropensity + parameters.balanceWeight * features.probabilityBalance + parameters.entropyWeight * features.normalizedEntropy + parameters.interactionWeight * features.proximityLowGoalInteraction, drawRaw = logistic(logit), decisive = v1.probabilities.homeWin + v1.probabilities.awayWin, homeShare = decisive ? v1.probabilities.homeWin / decisive : .5, homeWin = round((1 - drawRaw) * homeShare), draw = round(drawRaw), awayWin = round(1 - homeWin - draw), probabilities = { homeWin, draw, awayWin }, assessed = confidence(input, probabilities);
  const drawFactor = { type: "explicit_draw_signal", context: "match", direction: "neutral", strength: draw >= .36 ? "strong" : draw >= .3 ? "moderate" : "slight", summary: "Draw mass combines point-in-time strength proximity, expected goals, probability geometry and historical draw propensity while preserving v1's home/away ratio." } as const;
  return { ...v1, modelVersion: HISTORICAL_V2_MODEL_VERSION, probabilities, confidence: assessed, dataQuality: { ...v1.dataQuality, confidence: assessed }, supportingFactors: [...v1.supportingFactors, drawFactor].slice(0, 6) };
}
