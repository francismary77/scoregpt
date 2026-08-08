import type { FootballCompetitionConfig } from "@/config/football-data";
import type { FootballDataProvider } from "@/modules/intelligence/providers";
import { expiresAtFor } from "./freshness";
import type { IngestionResult, NormalizedSnapshot, ProviderQuotaStatus, RefreshReason, StoredSnapshot } from "./domain";
import type { FootballIngestionRepository, ProviderRequestRepository } from "./repositories";

export class FootballDataIngestionService {
  private readonly refreshes = new Map<string, Promise<StoredSnapshot | null>>();
  constructor(
    private readonly provider: FootballDataProvider,
    private readonly repository: FootballIngestionRepository,
    private readonly requests: ProviderRequestRepository,
    private readonly competitions: readonly FootballCompetitionConfig[],
    private readonly dailyBudget: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private dayStart(): string {
    const now = this.now();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  }

  private async hasBudget(required = 1): Promise<boolean> {
    return (await this.requests.countRequests(this.provider.name, this.dayStart())) + required <= this.dailyBudget;
  }

  private async record(category: "competition" | NormalizedSnapshot["category"], endpoint: string, succeeded: boolean, cacheState: "fresh" | "stale" | "missing", refreshReason: RefreshReason, errorCode: string | null, requestCount = cacheState === "fresh" ? 0 : 1) {
    await this.requests.recordRequest({ provider: this.provider.name, category, endpoint, requestedAt: this.now().toISOString(), requestCount, succeeded, cacheState, refreshReason, errorCode });
  }

  async getQuotaStatus(): Promise<ProviderQuotaStatus> { return this.requests.getQuotaStatus(this.provider.name, this.dayStart(), this.dailyBudget); }

  async ingestCompetition(competitionId: string, reason: RefreshReason = "manual", requestedCategories?: readonly string[]): Promise<IngestionResult> {
    const config = this.competitions.find((item) => item.id === competitionId);
    if (!config?.enabled || !config.providerId || !config.currentSeason) return { status: "skipped", provider: this.provider.name, competitions: 0, teams: 0, fixtures: 0, snapshots: 0, reason: "Competition is disabled, unsupported or missing a provider mapping." };
    if (!this.provider.enabled) return { status: "degraded", provider: this.provider.name, competitions: 0, teams: 0, fixtures: 0, snapshots: 0, reason: "Live provider is disabled; existing database/demo data remains available." };
    const categories = requestedCategories?.filter((category) => config.dataCategories.some((enabled) => enabled === category)) ?? config.dataCategories;
    const estimatedRequests = this.provider.estimateCompetitionRequests?.(categories) ?? 1;
    if (!(await this.hasBudget(estimatedRequests))) return { status: "skipped", provider: this.provider.name, competitions: 0, teams: 0, fixtures: 0, snapshots: 0, reason: "Daily provider request budget would be exceeded." };
    try {
      const payload = await this.provider.fetchCompetitionData(config.providerId, config.currentSeason, categories);
      const expectedName = (config.providerName ?? config.name).trim().toLowerCase(), receivedName = payload.competition.name.trim().toLowerCase();
      if (payload.competition.providerId !== config.providerId || payload.competition.season !== config.currentSeason || payload.competition.country?.trim().toLowerCase() !== config.country.trim().toLowerCase() || receivedName !== expectedName || (categories.includes("metadata") && config.providerType && payload.competition.providerType !== config.providerType)) throw Object.assign(new Error("Provider competition identity did not match the verified configuration."), { name: "ProviderCompetitionIdentityError", requestCount: payload.requestCount ?? estimatedRequests });
      const counts = await this.repository.ingestBundle(this.provider.name, payload);
      await this.record("competition", "competition-bundle", true, "missing", reason, null, payload.requestCount ?? estimatedRequests);
      return { status: "completed", provider: this.provider.name, ...counts };
    } catch (error) {
      const requestCount = typeof error === "object" && error && "requestCount" in error && typeof error.requestCount === "number" ? error.requestCount : error instanceof Error && error.name === "MissingFootballProviderKeyError" ? 0 : 1;
      const errorCode = typeof error === "object" && error && "providerCode" in error && typeof error.providerCode === "string" ? error.providerCode : error instanceof Error ? error.name : "ProviderError";
      await this.record("competition", "competition-bundle", false, "missing", reason, errorCode, requestCount);
      return { status: "degraded", provider: this.provider.name, competitions: 0, teams: 0, fixtures: 0, snapshots: 0, reason: "Provider refresh failed; cached/demo data remains available." };
    }
  }

  async ingestEnabledCompetitions(reason: RefreshReason = "scheduled"): Promise<IngestionResult[]> {
    const enabled = this.competitions.filter((item) => item.enabled).sort((a, b) => a.priority - b.priority);
    const results: IngestionResult[] = [];
    for (const competition of enabled) results.push(await this.ingestCompetition(competition.id, reason));
    return results;
  }

  async getSnapshot(fixtureId: string, providerFixtureId: string, category: NormalizedSnapshot["category"], reason: RefreshReason = "manual"): Promise<StoredSnapshot | null> {
    let cached: StoredSnapshot | null = null;
    try {
      cached = await this.repository.getSnapshot(fixtureId, category, this.provider.name);
    } catch {
      if (!this.provider.enabled) return null;
    }
    if (cached?.provenance.cacheState === "fresh") {
      await this.record(category, "fixture-snapshot", true, "fresh", reason, null);
      return cached;
    }
    const estimatedRequests = this.provider.estimateFixtureRequests?.([category]) ?? 1;
    if (!this.provider.enabled || !(await this.hasBudget(estimatedRequests))) return cached;
    const refreshKey = `${this.provider.name}:${fixtureId}:${category}`;
    const inFlight = this.refreshes.get(refreshKey);
    if (inFlight) return inFlight;
    const refresh = this.refreshSnapshot(fixtureId, providerFixtureId, category, reason, cached)
      .finally(() => this.refreshes.delete(refreshKey));
    this.refreshes.set(refreshKey, refresh);
    return refresh;
  }

  private async refreshSnapshot(fixtureId: string, providerFixtureId: string, category: NormalizedSnapshot["category"], reason: RefreshReason, cached: StoredSnapshot | null): Promise<StoredSnapshot | null> {
    try {
      const refreshed = await this.provider.fetchFixtureData(providerFixtureId, [category]);
      const snapshot = refreshed.snapshots.find((item) => item.category === category);
      if (!snapshot) return cached;
      const expiresAt = expiresAtFor(category, refreshed.fixture.status, refreshed.fixture.kickoffAt, snapshot.fetchedAt);
      await this.repository.upsertSnapshot(this.provider.name, snapshot, fixtureId, expiresAt);
      await this.record(category, "fixture-snapshot", true, cached ? "stale" : "missing", cached ? "stale" : "missing", null, refreshed.requestCount ?? 1);
      return this.repository.getSnapshot(fixtureId, category, this.provider.name);
    } catch (error) {
      const requestCount = typeof error === "object" && error && "requestCount" in error && typeof error.requestCount === "number" ? error.requestCount : error instanceof Error && error.name === "MissingFootballProviderKeyError" ? 0 : 1;
      const errorCode = typeof error === "object" && error && "providerCode" in error && typeof error.providerCode === "string" ? error.providerCode : error instanceof Error ? error.name : "ProviderError";
      await this.record(category, "fixture-snapshot", false, cached ? "stale" : "missing", reason, errorCode, requestCount);
      return cached;
    }
  }
}
