import type { Json } from "@/lib/supabase/database.types";
import type { MatchStatus } from "@/modules/intelligence/domain";

export type FootballDataCategory =
  | "competition"
  | "season"
  | "team"
  | "fixture"
  | "score"
  | "standings"
  | "form"
  | "h2h"
  | "injuries"
  | "lineups"
  | "statistics"
  | "odds"
  | "other";
export type CacheState = "fresh" | "stale" | "missing";
export type RefreshReason = "scheduled" | "manual" | "missing" | "stale" | "near-match" | "live";

export interface DataProvenance {
  provider: string;
  providerReference: string | null;
  fetchedAt: string;
  expiresAt: string | null;
  cacheState: CacheState;
  isDemo: boolean;
}

export interface NormalizedCompetition {
  providerId: string;
  name: string;
  country: string | null;
  season: string;
  enabled: boolean;
  priority: number;
  providerType?: string | null;
}

export interface NormalizedTeam {
  providerId: string;
  competitionProviderId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  country: string | null;
}

export interface NormalizedFixture {
  providerId: string;
  competitionProviderId: string;
  homeTeamProviderId: string;
  awayTeamProviderId: string;
  kickoffAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  round?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
}

export interface NormalizedSnapshot {
  fixtureProviderId: string;
  category: Exclude<FootballDataCategory, "competition" | "season" | "team" | "fixture" | "score">;
  payload: Json;
  providerReference: string | null;
  fetchedAt: string;
}

export interface CompetitionIngestionPayload {
  competition: NormalizedCompetition;
  teams: NormalizedTeam[];
  fixtures: NormalizedFixture[];
  snapshots: NormalizedSnapshot[];
  fetchedAt: string;
  requestCount?: number;
}

export interface FixtureRefreshPayload {
  fixture: NormalizedFixture;
  snapshots: NormalizedSnapshot[];
  fetchedAt: string;
  requestCount?: number;
  providerIdentity?: { fixtureId: string; leagueId: string; season: string; homeTeamId: string; awayTeamId: string };
}

export interface SnapshotRefreshDiagnostic {
  fixtureId: string;
  providerFixtureId: string;
  category: NormalizedSnapshot["category"];
  status: "PERSISTED" | "EMPTY" | "PROVIDER_ERROR" | "PERSISTENCE_ERROR" | "CACHE_HIT" | "BUDGET_SKIPPED" | "NOT_EXPECTED" | "SHARED_REUSE";
  requestCount: number;
  errorCategory: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  httpStatus: number | null;
  providerIdentity: FixtureRefreshPayload["providerIdentity"] | null;
}

export interface StoredSnapshot {
  id: string;
  fixtureId: string;
  category: NormalizedSnapshot["category"];
  payload: Json;
  provenance: DataProvenance;
}

export interface ProviderRequestRecord {
  provider: string;
  category: FootballDataCategory;
  endpoint: string;
  requestedAt: string;
  requestCount: number;
  succeeded: boolean;
  cacheState: CacheState;
  refreshReason: RefreshReason;
  errorCode: string | null;
}

export interface IngestionResult {
  status: "completed" | "cache-hit" | "skipped" | "degraded";
  provider: string;
  competitions: number;
  teams: number;
  fixtures: number;
  snapshots: number;
  reason?: string;
}

export interface ProviderQuotaStatus {
  provider: string;
  requestsUsedToday: number;
  configuredDailyBudget: number;
  remainingBudget: number;
  cacheHits: number;
  providerAttempts: number;
  successes: number;
  failures: number;
}

export type BootstrapStage = "A" | "B" | "C" | "D";
export interface BootstrapPlanItem {
  stage: BootstrapStage;
  competitionId: string;
  competitionName: string;
  providerCompetitionId: string | null;
  categories: readonly string[];
  cacheExists: boolean;
  estimatedRequests: number;
  eligible: boolean;
  reason: string;
  season: string | null;
  competitionEnabled: boolean;
  requestedCategories: readonly string[];
  providerRequestCategories: readonly string[];
  cachedCategories: readonly string[];
  staleCategories: readonly string[];
  remainingBudgetBefore: number;
  remainingBudgetAfter: number;
  allowed: boolean;
  blockedReason: string | null;
  quotaWarning: string;
}

export interface CompetitionCacheInspection {
  competitionCount: number;
  teamCount: number;
  fixtureCount: number;
  snapshotCategories: string[];
  freshCategories: string[];
  staleCategories: string[];
  providerReferences: string[];
  lastFetchedAt: string | null;
  duplicateWarnings: string[];
  malformedWarnings: string[];
}

export interface FootballVerificationReport extends CompetitionCacheInspection {
  provider: string;
  competitionId: string;
  competitionName: string;
  providerCompetitionId: string | null;
  season: string | null;
  requestAuditRows: number;
  requestsUsedToday: number;
  configuredDailyBudget: number;
  remainingBudget: number;
  providerCallsMade: 0;
}

export interface BootstrapPlan {
  dryRun: true;
  provider: string;
  requestsUsedToday: number;
  configuredDailyBudget: number;
  remainingBudget: number;
  estimatedRequests: number;
  items: BootstrapPlanItem[];
}

export interface PersistedHomepageFootballData {
  competitions: Array<{ id: string; name: string; country: string | null; season: string }>;
  upcomingFixtures: Array<{ id: string; competitionId: string; homeTeamId: string; awayTeamId: string; kickoffAt: string; status: string }>;
  recentResults: Array<{ id: string; competitionId: string; homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null; kickoffAt: string }>;
  headlineReports: Array<{ id: string; fixtureId: string; recommendedMarket: string | null; confidence: number | null; riskLevel: string | null }>;
}
