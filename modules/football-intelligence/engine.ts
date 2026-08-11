import type { MatchAnalysisInput, MatchAnalysisTeam } from "@/modules/football-data/historical";
import { HISTORICAL_MODEL_VERSION, historicalModelWeights, type HistoricalModelWeights } from "./config";
import type { GoalMarketProbabilities, IntelligenceConfidence, IntelligenceFactor, MatchIntelligenceResult } from "./domain";

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const finite = (value: number | null | undefined, fallback = 0.5) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
// Four decimal places avoids presenting precision unsupported by historical inputs.
const rounded = (value: number) => Number(value.toFixed(4));
const perGame = (value: number, played: number) => played ? value / played : null;
const weightedRate = (value: number | null, neutral = 0.5) => finite(value, neutral);

function strength(team: MatchAnalysisTeam, weights: HistoricalModelWeights): number {
  const profile = team.profile, venue = team.relevantForm;
  if (!profile.played) return 0.5;
  const goalDifferencePerGame = (profile.goalsFor - profile.goalsAgainst) / profile.played;
  const values = {
    seasonPointsPerGame: clamp(finite(team.strength.seasonPointsPerGame, 1.5) / 3),
    seasonGoalDifference: clamp(0.5 + goalDifferencePerGame / 4),
    seasonAttack: clamp(finite(profile.goalsPerMatch, 1.5) / 3),
    seasonDefence: clamp(1 - finite(profile.goalsConcededPerMatch, 1.5) / 3),
    recentPointsPerGame: clamp(finite(team.strength.recentPointsPerGame, 1.5) / 3),
    recentWinRate: weightedRate(team.strength.recentWinRate),
    venuePointsPerGame: clamp((venue.played ? venue.points / venue.played : 1.5) / 3),
    scoringRate: weightedRate(team.strength.scoringRate),
    cleanSheetRate: weightedRate(team.strength.cleanSheetRate),
  };
  return clamp(Object.entries(values).reduce((sum, [key, value]) => sum + value * weights[key as keyof typeof values], 0));
}

function confidence(input: MatchAnalysisInput): IntelligenceConfidence {
  const { context } = input, homeVenue = input.homeTeam.relevantForm.played, awayVenue = input.awayTeam.relevantForm.played;
  if (context.dataCompleteness === "strong" && context.historicalSampleSize >= 20 && context.recentSampleSize >= 5 && homeVenue >= 8 && awayVenue >= 8) return "strong";
  if (context.dataCompleteness !== "limited" && context.historicalSampleSize >= 8 && context.recentSampleSize >= 3 && homeVenue >= 3 && awayVenue >= 3) return "moderate";
  return "low";
}

function h2hAdjustment(input: MatchAnalysisInput, maximum: number): number {
  const h2h = input.h2h;
  if (!h2h.totalMeetings) return 0;
  const resultEdge = (h2h.firstTeamWins - h2h.secondTeamWins) / h2h.totalMeetings;
  const sampleWeight = Math.min(1, h2h.totalMeetings / 8);
  return clamp(resultEdge * maximum * sampleWeight, -maximum, maximum);
}

function probabilities(home: number, away: number, input: MatchAnalysisInput, weights: HistoricalModelWeights) {
  const differential = clamp(home - away + h2hAdjustment(input, weights.h2hMaximumAdjustment), -1, 1);
  const drawHistory = (input.homeTeam.profile.drawPercentage ?? 1 / 3) + (input.awayTeam.profile.drawPercentage ?? 1 / 3);
  const draw = clamp(0.29 - Math.abs(differential) * 0.18 + drawHistory * 0.04, 0.14, 0.34);
  const homeShare = 1 / (1 + Math.exp(-4 * differential));
  const homeWin = (1 - draw) * homeShare, awayWin = 1 - draw - homeWin;
  return { homeWin: rounded(homeWin), draw: rounded(draw), awayWin: rounded(awayWin + (1 - rounded(homeWin) - rounded(draw) - rounded(awayWin))) };
}

function poissonOver(lambda: number, threshold: 1 | 2 | 3): number { let cumulative = 0; for (let goals = 0; goals <= threshold; goals++) cumulative += Math.exp(-lambda) * lambda ** goals / [1, 1, 2, 6][goals]; return clamp(1 - cumulative); }
function goalIntelligence(input: MatchAnalysisInput) {
  const homeVenue = input.homeTeam.relevantForm, awayVenue = input.awayTeam.relevantForm;
  if (!homeVenue.played || !awayVenue.played) return { expectation: { expectedHomeGoals: null, expectedAwayGoals: null, expectedTotalGoals: null, methodology: "historical-scoring-conceding-rates" as const }, markets: { over15: null, over25: null, over35: null, bttsYes: null, bttsNo: null } satisfies GoalMarketProbabilities };
  const home = Math.max(0, (homeVenue.goalsFor / homeVenue.played + awayVenue.goalsAgainst / awayVenue.played) / 2);
  const away = Math.max(0, (awayVenue.goalsFor / awayVenue.played + homeVenue.goalsAgainst / homeVenue.played) / 2);
  const total = home + away, historical = (key: "over15" | "over25" | "over35" | "btts") => (finite(input.homeTeam.trends[key].rate, 0.5) + finite(input.awayTeam.trends[key].rate, 0.5)) / 2;
  const blend = (model: number, observed: number) => rounded(clamp(model * 0.7 + observed * 0.3));
  const bttsModel = (1 - Math.exp(-home)) * (1 - Math.exp(-away));
  const bttsYes = blend(bttsModel, historical("btts"));
  return { expectation: { expectedHomeGoals: rounded(home), expectedAwayGoals: rounded(away), expectedTotalGoals: rounded(total), methodology: "historical-scoring-conceding-rates" as const }, markets: { over15: blend(poissonOver(total, 1), historical("over15")), over25: blend(poissonOver(total, 2), historical("over25")), over35: blend(poissonOver(total, 3), historical("over35")), bttsYes, bttsNo: rounded(1 - bttsYes) } };
}

function factors(input: MatchAnalysisInput, home: number, away: number): IntelligenceFactor[] {
  const list: IntelligenceFactor[] = [], add = (factor: IntelligenceFactor) => list.push(factor);
  const difference = home - away;
  if (Math.abs(difference) >= 0.05) add({ type: "overall_strength_edge", context: difference > 0 ? "home" : "away", direction: difference > 0 ? "supports_home" : "supports_away", strength: Math.abs(difference) >= 0.2 ? "strong" : "moderate", summary: `${difference > 0 ? input.homeTeam.profile.team.name : input.awayTeam.profile.team.name} has the stronger combined historical profile.` });
  const homePpg = perGame(input.homeTeam.relevantForm.points, input.homeTeam.relevantForm.played), awayPpg = perGame(input.awayTeam.relevantForm.points, input.awayTeam.relevantForm.played);
  if (homePpg !== null && awayPpg !== null && Math.abs(homePpg - awayPpg) >= 0.3) add({ type: "venue_form_edge", context: homePpg > awayPpg ? "home" : "away", direction: homePpg > awayPpg ? "supports_home" : "supports_away", strength: Math.abs(homePpg - awayPpg) >= 0.8 ? "strong" : "moderate", summary: `Venue-specific points-per-match favour ${homePpg > awayPpg ? input.homeTeam.profile.team.name : input.awayTeam.profile.team.name}.` });
  if (input.homeTeam.trends.over25.rate !== null && input.awayTeam.trends.over25.rate !== null && (input.homeTeam.trends.over25.rate + input.awayTeam.trends.over25.rate) / 2 >= 0.6) add({ type: "frequent_over25_history", context: "match", direction: "supports_goals", strength: "moderate", summary: "Recent venue-specific histories contain a relatively high share of matches above 2.5 total goals." });
  if (input.h2h.totalMeetings < 3) add({ type: "limited_h2h_sample", context: "h2h", direction: "limits_confidence", strength: "moderate", summary: "The stored head-to-head sample is too small to carry meaningful model weight." });
  if (input.context.recentSampleSize < 5) add({ type: "insufficient_recent_data", context: "data", direction: "limits_confidence", strength: "strong", summary: "Recent-form evidence is limited." });
  if (!input.context.historicalSampleSize) add({ type: "insufficient_historical_data", context: "data", direction: "limits_confidence", strength: "strong", summary: "No completed historical match sample is available." });
  return list.slice(0, 6);
}

export function createHistoricalMatchIntelligence(input: MatchAnalysisInput, weights: HistoricalModelWeights = historicalModelWeights): MatchIntelligenceResult {
  const home = strength(input.homeTeam, weights), away = strength(input.awayTeam, weights), oneXTwo = probabilities(home, away, input, weights), goals = goalIntelligence(input), assessedConfidence = confidence(input);
  return { modelVersion: HISTORICAL_MODEL_VERSION, homeTeam: { id: input.homeTeam.profile.team.id, name: input.homeTeam.profile.team.name }, awayTeam: { id: input.awayTeam.profile.team.id, name: input.awayTeam.profile.team.name }, probabilities: oneXTwo, goalMarkets: goals.markets, goalExpectation: goals.expectation, strength: { home: rounded(home), away: rounded(away), differential: rounded(home - away) }, confidence: assessedConfidence, dataQuality: { classification: input.context.dataCompleteness, confidence: assessedConfidence, historicalSampleSize: input.context.historicalSampleSize, recentSampleSize: input.context.recentSampleSize, homeVenueSampleSize: input.homeTeam.relevantForm.played, awayVenueSampleSize: input.awayTeam.relevantForm.played, h2hSampleSize: input.context.h2hSampleSize, latestDataDate: input.context.latestDataDate }, supportingFactors: factors(input, home, away) };
}
