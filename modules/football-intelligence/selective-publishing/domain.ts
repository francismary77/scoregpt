import type { ProbabilityTriple } from "../domain";

export type PublishingTier = "TOP_PICK" | "STANDARD_ANALYSIS" | "LIMITED_EVIDENCE";
export type ConfidenceLabel = "LOW" | "MODERATE" | "STRONG";
export type RankingPopulationPolicy = "DAILY_GLOBAL" | "COMPETITION_DAY" | "COMPETITION_ROUND" | "ROLLING_WINDOW";
export type PublishingReasonCode = "INSUFFICIENT_HOME_HISTORY" | "INSUFFICIENT_AWAY_HISTORY" | "INSUFFICIENT_BOTH_TEAM_HISTORY" | "INVALID_PROBABILITIES" | "NON_FINITE_PROBABILITIES" | "UNNORMALIZED_PROBABILITIES" | "INVALID_SELECTED_OUTCOME" | "MISSING_CONFIDENCE_SCORE" | "INVALID_FIXTURE" | "INVALID_COMPETITION" | "INVALID_SEASON" | "LEAKAGE_GUARD_FAILURE" | "UNSUPPORTED_METHODOLOGY" | "INSUFFICIENT_RANKING_POPULATION" | "MANUALLY_SUPPRESSED" | "PUBLICATION_PAUSED" | "PUBLISHING_DISABLED" | "TOP_PICKS_DISABLED";
export type SelectedOutcome = "home" | "draw" | "away";

export interface SelectivePublishingInput {
  fixtureId: string; competitionId: string; season: string; kickoffAt: string; methodology: string;
  selectedOutcome: SelectedOutcome; probabilities: ProbabilityTriple; confidenceScore: number | null;
  evidence: { homeHistory: number; awayHistory: number; latestEvidenceAt: string | null; provenance?: { minimumPerTeam: number; weighting: "current-season-first-recency-selection"; home: { currentSeason: number; previousSeason: number; fixtureIds: string[] }; away: { currentSeason: number; previousSeason: number; fixtureIds: string[] } } };
}
export interface EligibilityCheck { code: string; passed: boolean }
export interface PublishingControls { publishingEnabled: boolean; topPicksEnabled: boolean; globalPause: boolean; suppressedFixtureIds: ReadonlySet<string> }
export interface RankingMetadata { populationSize: number; eligiblePopulationSize: number; rank: number | null; percentile: number | null; topPickCutoff: number; rankingPolicy: "DAILY_GLOBAL"; evaluationWindow: string; }
export interface OperationalPublicationState { publishable: boolean; publiclyPresentedTier: PublishingTier | null; suppressed: boolean; paused: boolean; }
export interface SelectivePublishingResult {
  fixtureId: string; predictionMethodology: string; confidenceMethodology: string; publishingPolicy: string;
  selectedOutcome: SelectedOutcome; probabilities: ProbabilityTriple; confidenceScore: number | null; confidenceLabel: ConfidenceLabel | null;
  publishingTier: PublishingTier; eligibility: EligibilityCheck[]; reasonCodes: PublishingReasonCode[]; rankingMetadata: RankingMetadata; publicationState: OperationalPublicationState;
}
export type AdminPublicationCommand = { type: "SUPPRESS" | "UNSUPPRESS"; fixtureId: string } | { type: "PAUSE_PUBLICATION"; paused: boolean };
