import { randomUUID } from "node:crypto";
import { cacheState, expiresAtFor } from "./freshness";
import type { CompetitionIngestionPayload, NormalizedCompetition, NormalizedFixture, NormalizedSnapshot, NormalizedTeam, ProviderRequestRecord, StoredSnapshot } from "./domain";
import type { FootballIngestionRepository, ProviderRequestRepository } from "./repositories";

type Entity<T> = T & { id: string };

export class MemoryFootballIngestionRepository implements FootballIngestionRepository {
  readonly competitions = new Map<string, Entity<NormalizedCompetition> & { lastSyncedAt: string }>();
  readonly teams = new Map<string, Entity<NormalizedTeam> & { competitionId: string; lastSyncedAt: string }>();
  readonly fixtures = new Map<string, Entity<NormalizedFixture> & { competitionId: string; homeTeamId: string; awayTeamId: string; lastSyncedAt: string }>();
  readonly snapshots = new Map<string, StoredSnapshot>();

  async upsertCompetition(provider: string, item: NormalizedCompetition, syncedAt: string): Promise<string> {
    const key = `${provider}:${item.providerId}:${item.season}`;
    const id = this.competitions.get(key)?.id ?? randomUUID();
    this.competitions.set(key, { ...item, id, lastSyncedAt: syncedAt });
    return id;
  }

  async upsertTeam(provider: string, item: NormalizedTeam, competitionId: string, syncedAt: string): Promise<string> {
    const key = `${provider}:${item.providerId}`;
    const id = this.teams.get(key)?.id ?? randomUUID();
    this.teams.set(key, { ...item, competitionId, id, lastSyncedAt: syncedAt });
    return id;
  }

  async upsertFixture(provider: string, item: NormalizedFixture, competitionId: string, homeTeamId: string, awayTeamId: string, syncedAt: string): Promise<string> {
    const key = `${provider}:${item.providerId}`;
    const id = this.fixtures.get(key)?.id ?? randomUUID();
    this.fixtures.set(key, { ...item, competitionId, homeTeamId, awayTeamId, id, lastSyncedAt: syncedAt });
    return id;
  }

  async upsertSnapshot(provider: string, item: NormalizedSnapshot, fixtureId: string, expiresAt: string | null): Promise<string> {
    const key = `${fixtureId}:${item.category}:${provider}`;
    const id = this.snapshots.get(key)?.id ?? randomUUID();
    this.snapshots.set(key, {
      id, fixtureId, category: item.category, payload: item.payload,
      provenance: { provider, providerReference: item.providerReference, fetchedAt: item.fetchedAt, expiresAt, cacheState: cacheState(expiresAt), isDemo: false },
    });
    return id;
  }

  async getSnapshot(fixtureId: string, category: NormalizedSnapshot["category"], provider: string): Promise<StoredSnapshot | null> {
    const item = this.snapshots.get(`${fixtureId}:${category}:${provider}`);
    return item ? { ...item, provenance: { ...item.provenance, cacheState: cacheState(item.provenance.expiresAt) } } : null;
  }

  async ingestBundle(provider: string, payload: CompetitionIngestionPayload) {
    const competitionId = await this.upsertCompetition(provider, payload.competition, payload.fetchedAt);
    const teamIds = new Map<string, string>();
    for (const team of payload.teams) teamIds.set(team.providerId, await this.upsertTeam(provider, team, competitionId, payload.fetchedAt));
    for (const team of this.teams.values()) if (team.competitionId === competitionId && !teamIds.has(team.providerId)) teamIds.set(team.providerId, team.id);
    const fixtureIds = new Map<string, string>();
    for (const fixture of payload.fixtures) {
      const home = teamIds.get(fixture.homeTeamProviderId);
      const away = teamIds.get(fixture.awayTeamProviderId);
      if (!home || !away) throw new Error(`Fixture ${fixture.providerId} references an unknown team.`);
      fixtureIds.set(fixture.providerId, await this.upsertFixture(provider, fixture, competitionId, home, away, payload.fetchedAt));
    }
    for (const snapshot of payload.snapshots) {
      const fixture = payload.fixtures.find((item) => item.providerId === snapshot.fixtureProviderId);
      const fixtureId = fixtureIds.get(snapshot.fixtureProviderId);
      if (!fixture || !fixtureId) throw new Error(`Snapshot references unknown fixture ${snapshot.fixtureProviderId}.`);
      await this.upsertSnapshot(provider, snapshot, fixtureId, expiresAtFor(snapshot.category, fixture.status, fixture.kickoffAt, snapshot.fetchedAt));
    }
    return { competitions: 1, teams: payload.teams.length, fixtures: payload.fixtures.length, snapshots: payload.snapshots.length };
  }

  async hasCompetitionData(provider: string, providerCompetitionId: string, season: string) {
    return this.competitions.has(`${provider}:${providerCompetitionId}:${season}`);
  }

  async inspectCompetition(provider: string, providerCompetitionId: string, season: string) {
    const competition = this.competitions.get(`${provider}:${providerCompetitionId}:${season}`);
    if (!competition) return { competitionCount: 0, teamCount: 0, fixtureCount: 0, snapshotCategories: [], freshCategories: [], staleCategories: [], providerReferences: [], lastFetchedAt: null, duplicateWarnings: [], malformedWarnings: [] };
    const teams = [...this.teams.values()].filter((item) => item.competitionId === competition.id);
    const fixtures = [...this.fixtures.values()].filter((item) => item.competitionId === competition.id);
    const fixtureIds = new Set(fixtures.map((item) => item.id));
    const snapshots = [...this.snapshots.values()].filter((item) => fixtureIds.has(item.fixtureId));
    const categories = [...new Set(snapshots.map((item) => item.category))];
    return { competitionCount: 1, teamCount: teams.length, fixtureCount: fixtures.length, snapshotCategories: categories, freshCategories: [...new Set(snapshots.filter((item) => cacheState(item.provenance.expiresAt) === "fresh").map((item) => item.category))], staleCategories: [...new Set(snapshots.filter((item) => cacheState(item.provenance.expiresAt) === "stale").map((item) => item.category))], providerReferences: snapshots.flatMap((item) => item.provenance.providerReference ? [item.provenance.providerReference] : []), lastFetchedAt: [competition.lastSyncedAt, ...teams.map((item) => item.lastSyncedAt), ...fixtures.map((item) => item.lastSyncedAt), ...snapshots.map((item) => item.provenance.fetchedAt)].sort().at(-1) ?? null, duplicateWarnings: [], malformedWarnings: [...teams.filter((item) => !item.providerId || !item.name).map((item) => `Incomplete team ${item.id}.`), ...fixtures.filter((item) => !item.providerId || !item.homeTeamId || !item.awayTeamId).map((item) => `Incomplete fixture ${item.id}.`)] };
  }
}

export class MemoryProviderRequestRepository implements ProviderRequestRepository {
  readonly records: ProviderRequestRecord[] = [];
  async countRequests(provider: string, since: string) { return this.records.filter((item) => item.provider === provider && item.requestedAt >= since).reduce((sum, item) => sum + item.requestCount, 0); }
  async recordRequest(record: ProviderRequestRecord) { this.records.push(record); }
  async getQuotaStatus(provider: string, since: string, configuredDailyBudget: number) {
    const records = this.records.filter((item) => item.provider === provider && item.requestedAt >= since);
    const requestsUsedToday = records.reduce((sum, item) => sum + item.requestCount, 0);
    return { provider, requestsUsedToday, configuredDailyBudget, remainingBudget: Math.max(0, configuredDailyBudget - requestsUsedToday), cacheHits: records.filter((item) => item.requestCount === 0 && item.cacheState === "fresh").length, providerAttempts: requestsUsedToday, successes: records.filter((item) => item.succeeded).reduce((sum, item) => sum + item.requestCount, 0), failures: records.filter((item) => !item.succeeded).reduce((sum, item) => sum + item.requestCount, 0) };
  }
  async countAuditRows(provider: string, since: string) { return this.records.filter((item) => item.provider === provider && item.requestedAt >= since).length; }
}
