import type { IntelligenceConfidence } from "@/modules/football-intelligence";
import type { BacktestReport, GoalMarketKey, MatchOutcome } from "./domain";

const weighted = (items: Array<{ value: number | null; weight: number }>) => { const valid = items.filter((item): item is { value: number; weight: number } => item.value !== null && item.weight > 0), total = valid.reduce((sum, item) => sum + item.weight, 0); return total ? valid.reduce((sum, item) => sum + item.value * item.weight, 0) / total : null; };
const sumOutcome = (reports: BacktestReport[], outcome: MatchOutcome, source: "selection" | "actual") => reports.reduce((sum, report) => sum + (source === "selection" ? report.oneXTwo.byPick[outcome].predictions : report.oneXTwo.actualResults[outcome]), 0);

export interface MultiLeagueBacktestSummary {
  leagues: Array<{ competitionId: string; competitionName: string; report: BacktestReport }>;
  aggregate: {
    predictions: number; correct: number; accuracy: number | null; multiclassBrierScore: number | null; logLoss: number | null;
    selections: Record<MatchOutcome, number>; actualResults: Record<MatchOutcome, number>;
    confidence: Record<IntelligenceConfidence, { predictions: number; accuracy: number | null; brierScore: number | null; logLoss: number | null }>;
    goalMarkets: Record<GoalMarketKey, { predictions: number; accuracy: number | null; brierScore: number | null; averageProbability: number | null; observedRate: number | null }>;
  };
}

export function aggregateBacktestReports(leagues: MultiLeagueBacktestSummary["leagues"]): MultiLeagueBacktestSummary {
  const reports = leagues.map((league) => league.report), predictions = reports.reduce((sum, report) => sum + report.oneXTwo.overall.predictions, 0), correct = reports.reduce((sum, report) => sum + report.oneXTwo.overall.correct, 0);
  const confidence = Object.fromEntries((["low", "moderate", "strong"] as const).map((level) => { const count = reports.reduce((sum, report) => sum + report.confidence[level].predictions, 0); return [level, { predictions: count, accuracy: count ? reports.reduce((sum, report) => sum + report.confidence[level].correct, 0) / count : null, brierScore: weighted(reports.map((report) => ({ value: report.confidence[level].brierScore, weight: report.confidence[level].predictions }))), logLoss: weighted(reports.map((report) => ({ value: report.confidence[level].logLoss, weight: report.confidence[level].predictions }))) }]; })) as MultiLeagueBacktestSummary["aggregate"]["confidence"];
  const goalMarkets = Object.fromEntries((["over15", "over25", "over35", "bttsYes", "bttsNo"] as const).map((market) => { const count = reports.reduce((sum, report) => sum + report.goalMarkets[market].predictions, 0); return [market, { predictions: count, accuracy: count ? reports.reduce((sum, report) => sum + report.goalMarkets[market].correct, 0) / count : null, brierScore: weighted(reports.map((report) => ({ value: report.goalMarkets[market].brierScore, weight: report.goalMarkets[market].predictions }))), averageProbability: weighted(reports.map((report) => ({ value: report.goalMarkets[market].averageProbability, weight: report.goalMarkets[market].predictions }))), observedRate: weighted(reports.map((report) => ({ value: report.goalMarkets[market].observedRate, weight: report.goalMarkets[market].predictions }))) }]; })) as MultiLeagueBacktestSummary["aggregate"]["goalMarkets"];
  return { leagues, aggregate: { predictions, correct, accuracy: predictions ? correct / predictions : null, multiclassBrierScore: weighted(reports.map((report) => ({ value: report.oneXTwo.multiclassBrierScore, weight: report.oneXTwo.overall.predictions }))), logLoss: weighted(reports.map((report) => ({ value: report.oneXTwo.logLoss, weight: report.oneXTwo.overall.predictions }))), selections: { home: sumOutcome(reports, "home", "selection"), draw: sumOutcome(reports, "draw", "selection"), away: sumOutcome(reports, "away", "selection") }, actualResults: { home: sumOutcome(reports, "home", "actual"), draw: sumOutcome(reports, "draw", "actual"), away: sumOutcome(reports, "away", "actual") }, confidence, goalMarkets } };
}
