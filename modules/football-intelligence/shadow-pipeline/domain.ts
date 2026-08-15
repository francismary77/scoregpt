import type { HistoricalDataset, HistoricalFixture } from "@/modules/football-data/historical";
import type { ConfidenceLabel, PublishingTier, SelectedOutcome } from "../selective-publishing";

export const SHADOW_VERSIONS = Object.freeze({ methodologyKey: "historical-v1", methodologyVersion: "historical-v1-frozen-4h", confidenceVersion: "compact-composite-4h9", publishingPolicyVersion: "selective-publishing-4h14" });
export type ShadowSkipReason = "PIPELINE_DISABLED" | "UNSUPPORTED_COMPETITION" | "INVALID_FIXTURE" | "FIXTURE_ALREADY_STARTED" | "FIXTURE_TOO_CLOSE_TO_KICKOFF" | "FIXTURE_CANCELLED" | "MISSING_KICKOFF" | "UNRESOLVED_TEAM" | "INSUFFICIENT_HISTORY" | "INVALID_PROBABILITIES" | "FUTURE_EVIDENCE" | "DUPLICATE_PREDICTION" | "PROVIDER_REFRESH_DISABLED";
export type SettlementStatus = "PENDING" | "SETTLED" | "VOID" | "CANCELLED" | "POSTPONED" | "ABANDONED" | "UNKNOWN_FINAL_STATE";
export type ShadowOperationalState = "SHADOW_ONLY" | "SUPPRESSED";

export interface SupportedShadowCompetition { internalCompetitionId: string; providerCompetitionId: string; name: string; providerName?: string; country: string; season: string; enabled: boolean }
export interface ShadowPipelineControls { enabled: boolean; providerCallsEnabled: boolean; publicPublishingEnabled: boolean; globallyPaused: boolean; horizonHours: number; maxProviderRequestsPerRun: number; maxFixtureRefreshAgeMinutes: number }
export interface ShadowPipelineOptions { now: string; dryRun?: boolean; persist?: boolean; providerRefresh?: boolean; horizonHours?: number; minimumLeadMinutes?: number }
export interface ShadowFixtureSource { dataset: HistoricalDataset; upcomingFixtures: HistoricalFixture[]; supportedCompetition: SupportedShadowCompetition }
export interface ShadowPredictionRecord {
  id: string; runId: string; fixtureId: string; providerFixtureId: string; competitionId: string; providerCompetitionId: string; season: string; homeTeamId: string; awayTeamId: string;
  kickoffAt: string; predictionCreatedAt: string; evidenceCutoffAt: string; selectedOutcome: SelectedOutcome; homeProbability: number; drawProbability: number; awayProbability: number;
  methodologyKey: string; methodologyVersion: string; confidenceVersion: string; confidenceScoreInternal: number; confidenceLabel: ConfidenceLabel;
  publishingTierCalculated: PublishingTier; publishingPolicyVersion: string; rankingScope: "DAILY_GLOBAL"; rankingDate: string; rankingPosition: number | null; eligiblePopulationSize: number;
  isTopPickCalculated: boolean; operationalPublicationState: ShadowOperationalState; shadowMode: true; settlementStatus: SettlementStatus;
  actualHomeGoals: number | null; actualAwayGoals: number | null; actualOutcome: SelectedOutcome | null; predictionCorrect: boolean | null; settledAt: string | null;
  methodologySnapshot: { methodology: string; confidence: string; publishingPolicy: string }; createdAt: string; updatedAt: string;
}
export interface ShadowRunRecord { id: string; startedAt: string; completedAt: string; mode: "DRY_RUN" | "SHADOW_PERSIST"; sourceType: "PERSISTED_DATABASE" | "PERSISTED_DATABASE_WITH_PROVIDER_REFRESH"; operationalStatus: "COMPLETED" | "PARTIAL" | "FAILED"; horizonStart: string; horizonEnd: string; fixturesFound: number; fixturesEligible: number; predictionsCreated: number; predictionsPersisted: number; predictionsReused: number; predictionsSkipped: number; topPicksCalculated: number; providerRequests: number; errorsCount: number; methodologyVersion: string; confidenceVersion: string; policyVersion: string; failureSummary: string | null }
export interface ShadowSkip { fixtureId: string | null; reason: ShadowSkipReason; detail?: string }
export interface ShadowPipelineReport { status: "DISABLED" | "PAUSED" | "COMPLETED" | "PARTIAL"; mode: "DRY_RUN" | "SHADOW_PERSIST"; runId: string; startedAt: string; completedAt: string; fixtureWindow: { start: string; end: string }; fixturesFound: number; fixturesEligible: number; predictionsCreated: number; predictionsReused: number; predictionsSkipped: number; topPicks: number; standardAnalyses: number; limitedEvidence: number; providerRequests: number; databaseWrites: number; publications: 0; notifications: 0; skips: ShadowSkip[]; errors: string[]; records: ShadowPredictionRecord[] }
export interface ShadowPipelineRepositories { predictions: ShadowPredictionRepository; runs: ShadowRunRepository }
export interface ShadowPredictionRepository { findByIdentity(identity: Pick<ShadowPredictionRecord, "fixtureId" | "methodologyVersion" | "publishingPolicyVersion" | "shadowMode">): Promise<ShadowPredictionRecord | null>; insert(record: ShadowPredictionRecord): Promise<{ record: ShadowPredictionRecord; created: boolean }>; list(): Promise<ShadowPredictionRecord[]>; updateSettlement(id: string, expectedUpdatedAt: string, settlement: Pick<ShadowPredictionRecord, "settlementStatus" | "actualHomeGoals" | "actualAwayGoals" | "actualOutcome" | "predictionCorrect" | "settledAt">): Promise<ShadowPredictionRecord> }
export interface ShadowRunRepository { insert(record: ShadowRunRecord): Promise<void>; list(): Promise<ShadowRunRecord[]> }
