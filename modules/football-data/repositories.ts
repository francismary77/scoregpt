import type { CompetitionIngestionPayload, NormalizedCompetition, NormalizedFixture, NormalizedSnapshot, NormalizedTeam, ProviderRequestRecord, StoredSnapshot } from "./domain";

export interface FootballIngestionRepository {
  upsertCompetition(provider: string, competition: NormalizedCompetition, syncedAt: string): Promise<string>;
  upsertTeam(provider: string, team: NormalizedTeam, competitionId: string, syncedAt: string): Promise<string>;
  upsertFixture(provider: string, fixture: NormalizedFixture, competitionId: string, homeTeamId: string, awayTeamId: string, syncedAt: string): Promise<string>;
  upsertSnapshot(provider: string, snapshot: NormalizedSnapshot, fixtureId: string, expiresAt: string | null): Promise<string>;
  getSnapshot(fixtureId: string, category: NormalizedSnapshot["category"], provider: string): Promise<StoredSnapshot | null>;
  ingestBundle(provider: string, payload: CompetitionIngestionPayload): Promise<{ competitions: number; teams: number; fixtures: number; snapshots: number }>;
}

export interface ProviderRequestRepository {
  countRequests(provider: string, since: string): Promise<number>;
  recordRequest(record: ProviderRequestRecord): Promise<void>;
}
