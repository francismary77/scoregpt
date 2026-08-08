import { randomUUID } from "node:crypto";
import { cacheState, expiresAtFor } from "./freshness";
import type { CompetitionIngestionPayload, NormalizedCompetition, NormalizedFixture, NormalizedSnapshot, NormalizedTeam, ProviderRequestRecord, StoredSnapshot } from "./domain";
import type { FootballIngestionRepository, ProviderRequestRepository } from "./repositories";

type Entity<T> = T & { id: string };

export class MemoryFootballIngestionRepository implements FootballIngestionRepository {
  readonly competitions = new Map<string, Entity<NormalizedCompetition>>();
  readonly teams = new Map<string, Entity<NormalizedTeam> & { competitionId: string }>();
  readonly fixtures = new Map<string, Entity<NormalizedFixture> & { competitionId: string; homeTeamId: string; awayTeamId: string }>();
  readonly snapshots = new Map<string, StoredSnapshot>();

  async upsertCompetition(provider: string, item: NormalizedCompetition, syncedAt: string): Promise<string> {
    void syncedAt;
    const key = `${provider}:${item.providerId}:${item.season}`;
    const id = this.competitions.get(key)?.id ?? randomUUID();
    this.competitions.set(key, { ...item, id });
    return id;
  }

  async upsertTeam(provider: string, item: NormalizedTeam, competitionId: string, syncedAt: string): Promise<string> {
    void syncedAt;
    const key = `${provider}:${item.providerId}`;
    const id = this.teams.get(key)?.id ?? randomUUID();
    this.teams.set(key, { ...item, competitionId, id });
    return id;
  }

  async upsertFixture(provider: string, item: NormalizedFixture, competitionId: string, homeTeamId: string, awayTeamId: string, syncedAt: string): Promise<string> {
    void syncedAt;
    const key = `${provider}:${item.providerId}`;
    const id = this.fixtures.get(key)?.id ?? randomUUID();
    this.fixtures.set(key, { ...item, competitionId, homeTeamId, awayTeamId, id });
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
}

export class MemoryProviderRequestRepository implements ProviderRequestRepository {
  readonly records: ProviderRequestRecord[] = [];
  async countRequests(provider: string, since: string) { return this.records.filter((item) => item.provider === provider && item.requestedAt >= since).reduce((sum, item) => sum + item.requestCount, 0); }
  async recordRequest(record: ProviderRequestRecord) { this.records.push(record); }
}
