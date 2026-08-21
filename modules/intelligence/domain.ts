export type DataSourceType = "mock" | "provider" | "internal";
export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled" | "abandoned" | "void";
export type PredictionStatus = "pending" | "won" | "lost" | "void";
export type PredictionOutcome = "home" | "draw" | "away" | "over" | "under" | "both-teams-score" | "double-chance";
export type RiskLevel = "low" | "medium" | "high";
export type ConfidenceLevel = "very-high"|"high"|"medium"|"low";
export type MembershipTier = "free" | "premium" | "business";

export interface SourceMetadata { sourceType: DataSourceType; isDemo: boolean; sourceLabel: string }
export interface Competition { id: string; name: string; shortName: string; country: string; season: string; badgeUrl?: string; source: SourceMetadata }
export interface Team { id: string; name: string; shortName: string; badgeUrl?: string; country: string }
export interface MatchScore { home: number | null; away: number | null }
export interface TeamForm { teamId: string; sequence: Array<"W" | "D" | "L">; summary: string }
export interface TeamComparisonStats { goalsScored:number; goalsConceded:number; wins:number; draws:number; losses:number; cleanSheets:number }
export interface MatchStatistics { possessionHome?: number; possessionAway?: number; shotsHome?: number; shotsAway?: number; home?:TeamComparisonStats; away?:TeamComparisonStats; headToHeadSummary: string }
export interface Fixture { id: string; competitionId: string; homeTeam: Team; awayTeam: Team; kickoff: string; displayKickoff: string; status: MatchStatus; score: MatchScore; venue?: string; source: SourceMetadata }
export interface ConfidenceScore { value: number; label: ConfidenceLevel }
export interface PredictionMarket { id: string; label: string; outcome: PredictionOutcome }
export interface AIReasoning { summary: string; bullets: string[]; supportingFactors: string[] }
export interface MarketIntelligence {id:string;market:string;prediction:string;confidence:ConfidenceScore;risk:RiskLevel;reasoning:string;recommended:boolean}
export interface TeamIntelligence {summary:string;strengths:string[];weaknesses:string[];tacticalStyle:string[]}
export interface RiskIntelligence {level:RiskLevel;factors:string[];explanation:string}
export interface Prediction { id: string; fixtureId: string; market: PredictionMarket; confidence: ConfidenceScore; risk: RiskLevel; status: PredictionStatus; reasoning: AIReasoning; generatedAt: string; source: SourceMetadata; accessLevel?:import("@/modules/account/domain").ContentAccessLevel }
export interface IntelligenceReport { id: string; fixture: Fixture; competition: Competition; prediction: Prediction; markets:MarketIntelligence[]; homeForm: TeamForm; awayForm: TeamForm; homeIntelligence:TeamIntelligence;awayIntelligence:TeamIntelligence; statistics: MatchStatistics; shortAnalysis: string; tacticalOutlook:string;expectedMatchFlow:string;recommendedMarket:MarketIntelligence;marketsToAvoid:Array<{market:string;reason:string}>;confidenceExplanation:string;riskIntelligence:RiskIntelligence;generatedAt: string; dataUpdatedAt: string; source: SourceMetadata }
export interface ResultRecord { id: string; predictionId: string; fixtureId: string; competitionId: string; fixtureLabel: string; marketLabel: string; scoreLabel: string; outcome: PredictionStatus; publishedAt: string; source: SourceMetadata }

export function confidenceScore(value: number): ConfidenceScore {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new RangeError("Confidence must be between 0 and 100.");
  return { value, label: value >= 85 ? "very-high" : value >= 75 ? "high" : value >= 60 ? "medium" : "low" };
}

export function isRiskLevel(value: string): value is RiskLevel { return ["low", "medium", "high"].includes(value); }
export function isPredictionStatus(value: string): value is PredictionStatus { return ["pending", "won", "lost", "void"].includes(value); }
export function isMatchStatus(value: string): value is MatchStatus { return ["scheduled", "live", "finished", "postponed", "cancelled", "abandoned", "void"].includes(value); }
