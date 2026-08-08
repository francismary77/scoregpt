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
  | "odds";
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
}

export interface FixtureRefreshPayload {
  fixture: NormalizedFixture;
  snapshots: NormalizedSnapshot[];
  fetchedAt: string;
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
