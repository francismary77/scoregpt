import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { cacheState, expiresAtFor } from "@/modules/football-data/freshness";
import type { CompetitionIngestionPayload, NormalizedCompetition, NormalizedFixture, NormalizedSnapshot, NormalizedTeam, ProviderRequestRecord } from "@/modules/football-data/domain";
import type { FootballIngestionRepository, PersistedFootballReadRepository, ProviderRequestRepository } from "@/modules/football-data/repositories";

type Client = SupabaseClient<Database>;
function requireData<T>(data: T | null, error: { message: string } | null, entity: string): T {
  if (error) throw new Error(`Supabase football repository error: ${error.message}`);
  if (!data) throw new Error(`Supabase football repository error: ${entity} was not returned.`);
  return data;
}

export class SupabaseFootballIngestionRepository implements FootballIngestionRepository {
  constructor(private readonly client: Client) {}

  private async rejectDemoCollision(table: "competitions" | "teams" | "fixtures", providerColumn: "provider_id" | "provider_fixture_id", provider: string, providerId: string) {
    const query = table === "fixtures"
      ? this.client.from("fixtures").select("id,is_demo").eq("provider", provider).eq("provider_fixture_id", providerId).limit(1)
      : table === "teams"
        ? this.client.from("teams").select("id,is_demo").eq("provider", provider).eq("provider_id", providerId).limit(1)
        : this.client.from("competitions").select("id,is_demo").eq("provider", provider).eq("provider_id", providerId).limit(1);
    void providerColumn;
    const { data, error } = await query;
    if (error) throw new Error("Supabase football repository collision check failed.");
    if (data?.[0]?.is_demo) throw new Error("A demonstration record already uses this provider identity; explicit mapping is required before overwrite.");
  }

  async upsertCompetition(provider: string, item: NormalizedCompetition, syncedAt: string) {
    await this.rejectDemoCollision("competitions", "provider_id", provider, item.providerId);
    const result = await this.client.from("competitions").upsert({ provider, provider_id: item.providerId, name: item.name, country: item.country, season: item.season, enabled: item.enabled, priority: item.priority, last_synced_at: syncedAt, is_demo: false }, { onConflict: "provider,provider_id,season" }).select("id").single();
    return requireData(result.data, result.error, "competition").id;
  }

  async upsertTeam(provider: string, item: NormalizedTeam, competitionId: string, syncedAt: string) {
    await this.rejectDemoCollision("teams", "provider_id", provider, item.providerId);
    const result = await this.client.from("teams").upsert({ provider, provider_id: item.providerId, name: item.name, short_name: item.shortName, logo_url: item.logoUrl, country: item.country, last_synced_at: syncedAt, is_demo: false }, { onConflict: "provider,provider_id" }).select("id").single();
    const teamId = requireData(result.data, result.error, "team").id;
    const membership = await this.client.from("team_competition_seasons").upsert({ team_id: teamId, competition_id: competitionId }, { onConflict: "team_id,competition_id" });
    if (membership.error) throw new Error("Supabase football repository team membership upsert failed.");
    return teamId;
  }

  async upsertFixture(provider: string, item: NormalizedFixture, competitionId: string, homeTeamId: string, awayTeamId: string, syncedAt: string) {
    await this.rejectDemoCollision("fixtures", "provider_fixture_id", provider, item.providerId);
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
    if (payload.teams.length) {
      const providerIds = payload.teams.map((team) => team.providerId), collision = await this.client.from("teams").select("provider_id").eq("provider", provider).eq("is_demo", true).in("provider_id", providerIds).limit(1);
      if (collision.error) throw new Error("Supabase football repository team collision check failed.");
      if (collision.data?.length) throw new Error("A demonstration team uses a provider identity in this bundle; explicit mapping is required.");
      const result = await this.client.from("teams").upsert(payload.teams.map((team) => ({ provider, provider_id: team.providerId, name: team.name, short_name: team.shortName, logo_url: team.logoUrl, country: team.country, last_synced_at: payload.fetchedAt, is_demo: false })), { onConflict: "provider,provider_id" }).select("id,provider_id");
      if (result.error) throw new Error("Supabase football repository team bulk upsert failed.");
      for (const team of result.data ?? []) if (team.provider_id) teamIds.set(team.provider_id, team.id);
      const memberships = await this.client.from("team_competition_seasons").upsert([...teamIds.values()].map((teamId) => ({ team_id: teamId, competition_id: competitionId })), { onConflict: "team_id,competition_id" });
      if (memberships.error) throw new Error("Supabase football repository team membership bulk upsert failed.");
    }
    const requiredTeamProviderIds = [...new Set(payload.fixtures.flatMap((fixture) => [fixture.homeTeamProviderId, fixture.awayTeamProviderId]))].filter((providerId) => !teamIds.has(providerId));
    if (requiredTeamProviderIds.length) {
      const { data, error } = await this.client.from("teams").select("id,provider_id").eq("provider", provider).in("provider_id", requiredTeamProviderIds);
      if (error) throw new Error("Supabase football repository team lookup failed.");
      const ids = (data ?? []).map((team) => team.id), membership = ids.length ? await this.client.from("team_competition_seasons").select("team_id").eq("competition_id", competitionId).in("team_id", ids) : { data: [], error: null };
      if (membership.error) throw new Error("Supabase football repository team membership lookup failed.");
      const members = new Set((membership.data ?? []).map((row) => row.team_id));
      for (const team of data ?? []) if (team.provider_id && members.has(team.id)) teamIds.set(team.provider_id, team.id);
    }
    const fixtureIds = new Map<string, string>(), fixtureByProviderId = new Map(payload.fixtures.map((fixture) => [fixture.providerId, fixture]));
    if (payload.fixtures.length) {
      const providerIds = payload.fixtures.map((fixture) => fixture.providerId), collision = await this.client.from("fixtures").select("provider_fixture_id").eq("provider", provider).eq("is_demo", true).in("provider_fixture_id", providerIds).limit(1);
      if (collision.error) throw new Error("Supabase football repository fixture collision check failed.");
      if (collision.data?.length) throw new Error("A demonstration fixture uses a provider identity in this bundle; explicit mapping is required.");
      const rows = payload.fixtures.map((fixture) => { const home = teamIds.get(fixture.homeTeamProviderId), away = teamIds.get(fixture.awayTeamProviderId); if (!home || !away) throw new Error(`Fixture ${fixture.providerId} references an unknown team.`); return { provider, provider_fixture_id: fixture.providerId, competition_id: competitionId, home_team_id: home, away_team_id: away, kickoff_at: fixture.kickoffAt, status: fixture.status, home_score: fixture.homeScore, away_score: fixture.awayScore, source: provider, last_synced_at: payload.fetchedAt, is_demo: false }; });
      const result = await this.client.from("fixtures").upsert(rows, { onConflict: "provider,provider_fixture_id" }).select("id,provider_fixture_id");
      if (result.error) throw new Error("Supabase football repository fixture bulk upsert failed.");
      for (const fixture of result.data ?? []) if (fixture.provider_fixture_id) fixtureIds.set(fixture.provider_fixture_id, fixture.id);
    }
    if (payload.snapshots.length) {
      const rows = payload.snapshots.map((snapshot) => { const fixture = fixtureByProviderId.get(snapshot.fixtureProviderId), fixtureId = fixtureIds.get(snapshot.fixtureProviderId); if (!fixture || !fixtureId) throw new Error(`Snapshot references unknown fixture ${snapshot.fixtureProviderId}.`); return { fixture_id: fixtureId, data_type: snapshot.category, payload: snapshot.payload, provider, fetched_at: snapshot.fetchedAt, expires_at: expiresAtFor(snapshot.category, fixture.status, fixture.kickoffAt, snapshot.fetchedAt), source_reference: snapshot.providerReference, is_demo: false }; });
      const result = await this.client.from("football_data_snapshots").upsert(rows, { onConflict: "fixture_id,data_type,provider" });
      if (result.error) throw new Error("Supabase football repository snapshot bulk upsert failed.");
    }
    return { competitions: 1, teams: payload.teams.length, fixtures: payload.fixtures.length, snapshots: payload.snapshots.length };
  }

  async hasCompetitionData(provider: string, providerCompetitionId: string, season: string) {
    const { data, error } = await this.client.from("competitions").select("id").eq("provider", provider).eq("provider_id", providerCompetitionId).eq("season", season).limit(1);
    if (error) throw new Error(`Supabase football repository error: ${error.message}`);
    return Boolean(data?.length);
  }

  async inspectCompetition(provider: string, providerCompetitionId: string, season: string) {
    const competitionResult = await this.client.from("competitions").select("id,provider_id,last_synced_at,name").eq("provider", provider).eq("provider_id", providerCompetitionId).eq("season", season);
    if (competitionResult.error) throw new Error(`Supabase football repository error: ${competitionResult.error.message}`);
    const competitionRows = competitionResult.data ?? [], competitionIds = competitionRows.map((item) => item.id);
    if (!competitionIds.length) return { competitionCount: 0, teamCount: 0, fixtureCount: 0, snapshotCategories: [], freshCategories: [], staleCategories: [], providerReferences: [], lastFetchedAt: null, duplicateWarnings: [], malformedWarnings: [] };
    const [membershipResult, fixtureResult] = await Promise.all([
      this.client.from("team_competition_seasons").select("team_id").in("competition_id", competitionIds),
      this.client.from("fixtures").select("id,provider_fixture_id,home_team_id,away_team_id,last_synced_at").in("competition_id", competitionIds).eq("provider", provider),
    ]);
    if (membershipResult.error || fixtureResult.error) throw new Error("Supabase football repository inspection failed.");
    const membershipTeamIds = [...new Set((membershipResult.data ?? []).map((row) => row.team_id))], teamResult = membershipTeamIds.length ? await this.client.from("teams").select("id,provider_id,name,last_synced_at").in("id", membershipTeamIds).eq("provider", provider) : { data: [], error: null };
    if (teamResult.error) throw new Error("Supabase football repository inspection failed.");
    const teams = teamResult.data ?? [], fixtures = fixtureResult.data ?? [], fixtureIds = fixtures.map((item) => item.id);
    const snapshotResult = fixtureIds.length ? await this.client.from("football_data_snapshots").select("data_type,fetched_at,expires_at,source_reference").in("fixture_id", fixtureIds).eq("provider", provider) : { data: [], error: null };
    if (snapshotResult.error) throw new Error("Supabase football repository inspection failed.");
    const snapshots = snapshotResult.data ?? [], now = new Date(), duplicateWarnings: string[] = [];
    const duplicates = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)).filter((value, index, all) => all.indexOf(value) !== index))];
    if (competitionRows.length > 1) duplicateWarnings.push(`Found ${competitionRows.length} competition rows for the provider/season key.`);
    for (const id of duplicates(teams.map((item) => item.provider_id))) duplicateWarnings.push(`Duplicate team provider ID ${id}.`);
    for (const id of duplicates(fixtures.map((item) => item.provider_fixture_id))) duplicateWarnings.push(`Duplicate fixture provider ID ${id}.`);
    const timestamps = [...competitionRows.map((item) => item.last_synced_at), ...teams.map((item) => item.last_synced_at), ...fixtures.map((item) => item.last_synced_at), ...snapshots.map((item) => item.fetched_at)].filter((value): value is string => Boolean(value)).sort();
    return { competitionCount: competitionRows.length, teamCount: teams.length, fixtureCount: fixtures.length, snapshotCategories: [...new Set(snapshots.map((item) => item.data_type))], freshCategories: [...new Set(snapshots.filter((item) => !item.expires_at || new Date(item.expires_at) > now).map((item) => item.data_type))], staleCategories: [...new Set(snapshots.filter((item) => item.expires_at && new Date(item.expires_at) <= now).map((item) => item.data_type))], providerReferences: snapshots.flatMap((item) => item.source_reference ? [item.source_reference] : []), lastFetchedAt: timestamps.at(-1) ?? null, duplicateWarnings, malformedWarnings: [...teams.filter((item) => !item.provider_id || !item.name).map((item) => `Incomplete team ${item.id}.`), ...fixtures.filter((item) => !item.provider_fixture_id || !item.home_team_id || !item.away_team_id).map((item) => `Incomplete fixture ${item.id}.`)] };
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
  async getQuotaStatus(provider: string, since: string, configuredDailyBudget: number) {
    const { data, error } = await this.client.from("football_provider_requests").select("request_count,succeeded,cache_state").eq("provider", provider).gte("requested_at", since);
    if (error) throw new Error(`Supabase football repository error: ${error.message}`);
    const records = data ?? [], requestsUsedToday = records.reduce((sum, row) => sum + row.request_count, 0);
    return { provider, requestsUsedToday, configuredDailyBudget, remainingBudget: Math.max(0, configuredDailyBudget - requestsUsedToday), cacheHits: records.filter((row) => row.request_count === 0 && row.cache_state === "fresh").length, providerAttempts: requestsUsedToday, successes: records.filter((row) => row.succeeded).reduce((sum, row) => sum + row.request_count, 0), failures: records.filter((row) => !row.succeeded).reduce((sum, row) => sum + row.request_count, 0) };
  }
  async countAuditRows(provider: string, since: string) {
    const { count, error } = await this.client.from("football_provider_requests").select("id", { count: "exact", head: true }).eq("provider", provider).gte("requested_at", since);
    if (error) throw new Error("Supabase football repository audit inspection failed.");
    return count ?? 0;
  }
}

export class SupabasePersistedFootballReadRepository implements PersistedFootballReadRepository {
  constructor(private readonly client: Client) {}
  async getHomepageData(options: { competitionLimit?: number; fixtureLimit?: number; resultLimit?: number; reportLimit?: number } = {}) {
    const now = new Date().toISOString(), competitionLimit = options.competitionLimit ?? 5, fixtureLimit = options.fixtureLimit ?? 6, resultLimit = options.resultLimit ?? 5, reportLimit = options.reportLimit ?? 3;
    const [competitions, upcoming, results, reports] = await Promise.all([
      this.client.from("competitions").select("id,name,country,season").eq("enabled", true).order("priority").limit(competitionLimit),
      this.client.from("fixtures").select("id,competition_id,home_team_id,away_team_id,kickoff_at,status").gte("kickoff_at", now).order("kickoff_at").limit(fixtureLimit),
      this.client.from("fixtures").select("id,competition_id,home_team_id,away_team_id,home_score,away_score,kickoff_at").in("status", ["finished", "cancelled"]).order("kickoff_at", { ascending: false }).limit(resultLimit),
      this.client.from("intelligence_reports").select("id,fixture_id,recommended_market,confidence,risk_level").eq("status", "published").order("generated_at", { ascending: false }).limit(reportLimit),
    ]);
    for (const response of [competitions, upcoming, results, reports]) if (response.error) throw new Error(`Supabase football read error: ${response.error.message}`);
    return {
      competitions: (competitions.data ?? []).map((row) => ({ id: row.id, name: row.name, country: row.country, season: row.season })),
      upcomingFixtures: (upcoming.data ?? []).map((row) => ({ id: row.id, competitionId: row.competition_id, homeTeamId: row.home_team_id, awayTeamId: row.away_team_id, kickoffAt: row.kickoff_at, status: row.status })),
      recentResults: (results.data ?? []).map((row) => ({ id: row.id, competitionId: row.competition_id, homeTeamId: row.home_team_id, awayTeamId: row.away_team_id, homeScore: row.home_score, awayScore: row.away_score, kickoffAt: row.kickoff_at })),
      headlineReports: (reports.data ?? []).map((row) => ({ id: row.id, fixtureId: row.fixture_id, recommendedMarket: row.recommended_market, confidence: row.confidence, riskLevel: row.risk_level })),
    };
  }
}
