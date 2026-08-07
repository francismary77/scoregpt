export type ResultState = "Won" | "Lost" | "Void";
export type RiskLevel = "Low" | "Medium" | "High";

export interface MatchPreview {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff: string;
  insight: string;
  confidence: number;
  risk: RiskLevel;
}

export interface MatchResult {
  fixture: string;
  market: string;
  score: string;
  state: ResultState;
}
