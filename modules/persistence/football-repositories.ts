import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { cacheState, expiresAtFor } from "@/modules/football-data/freshness";
import type { CompetitionIngestionPayload, NormalizedCompetition, NormalizedFixture, NormalizedSnapshot, NormalizedTeam, ProviderRequestRecord } from "@/modules/football-data/domain";
import type { FootballIngestionRepository, ProviderRequestRepository } from "@/modules/football-data/repositories";

type Client = SupabaseClient<Database>;
function requireData<T>(data: T | null, error: { message: string } | null, entity: string): T {
  if (error) throw new Error(`Supabase football repository error: ${error.message}`);
  if (!data) throw new Error(`Supabase football repository error: ${entity} was not returned.`);
  return data;
}

export class SupabaseFootballIngestionRepository implements FootballIngestionRepository {
  constructor(private readonly client: Client) {}

  async upsertCompetition(provider: string, item: NormalizedCompetition, syncedAt: string) {
    const result = await this.client.from("competitions").upsert({ provider, provider_id: item.providerId, name: item.name, country: item.country, season: item.season, enabled: item.enabled, priority: item.priority, last_synced_at: syncedAt, is_demo: false }, { onConflict: "provider,provider_id,season" }).select("id").single();
    return requireData(result.data, result.error, "competition").id;
  }

  async upsertTeam(provider: string, item: NormalizedTeam, competitionId: string, syncedAt: string) {
    const result = await this.client.from("teams").upsert({ provider, provider_id: item.providerId, competition_id: competitionId, name: item.name, short_name: item.shortName, logo_url: item.logoUrl, country: item.country, last_synced_at: syncedAt, is_demo: false }, { onConflict: "provider,provider_id" }).select("id").single();
    return requireData(result.data, result.error, "team").id;
  }

  async upsertFixture(provider: string, item: NormalizedFixture, competitionId: string, homeTeamId: string, awayTeamId: string, syncedAt: string) {
    const result = await this.client.from("fixtures").upsert({ provider, provider_fixture_id: item.providerId, competition_id: competitionId, home_team_id: homeTeamId, away_team_id: awayTeamId, kickoff_at: item.kickoffAt, status: item.status, home_score: item.homeScore, away_score: item.awayScore, source: provider, last_synced_at: syncedAt, is_demo: false }, { onConflict: "provider,provider_fixture_id" }).select("id").single();
    return requireData(result.data, result.error, "fixture").id;
  }

  async upsertSnapshot(provider: string, item: NormalizedSnapshot, fixtureId: string, expiresAt: string | null) {
    const result = await this.client.from("football_data_snapshots").upsert({ fixture_id: fixtureId, data_type: item.category, payload: item.payload, provider, fetched_at: item.fetchedAt, expires_at: expiresAt, source_reference: item.providerReference, is_demo: false }, { onConflict: "fixture_id,data_type,provider" }).select("id").single();
    return requireData(result.data, result.error, "snapshot").id;
  }

  async getSnapshot(fixtureId: string, category: NormalizedSnapshot["category"], provider: string) {
    const { data, error } = await this.client.from("football_data_snapshots").select("id,fixture_id,data_type,payload,provider,fetched_at,expires_at,source_reference,is_demo").eq("fixture_id", fixtureId).eq("data_type", category).eq("provider", provider).maybeSingle();
    if (error) throw new Error(`Supabase football repository error: ${error.message}`);
    if (!data) return null;
    return { id: data.id, fixtureId: data.fixture_id, category: data.data_type as NormalizedSnapshot["category"], payload: data.payload, provenance: { provider: data.provider, providerReference: data.source_reference, fetchedAt: data.fetched_at, expiresAt: data.expires_at, cacheState: cacheState(data.expires_at), isDemo: data.is_demo } };
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

export class SupabaseProviderRequestRepository implements ProviderRequestRepository {
  constructor(private readonly client: Client) {}
  async countRequests(provider: string, since: string) {
    const { data, error } = await this.client.from("football_provider_requests").select("request_count").eq("provider", provider).gte("requested_at", since);
    if (error) throw new Error(`Supabase football repository error: ${error.message}`);
    return (data ?? []).reduce((sum, row) => sum + row.request_count, 0);
  }
  async recordRequest(record: ProviderRequestRecord) {
    const { error } = await this.client.from("football_provider_requests").insert({ provider: record.provider, category: record.category, endpoint: record.endpoint, requested_at: record.requestedAt, request_count: record.requestCount, succeeded: record.succeeded, cache_state: record.cacheState, refresh_reason: record.refreshReason, error_code: record.errorCode });
    if (error) throw new Error(`Supabase football repository error: ${error.message}`);
  }
}
