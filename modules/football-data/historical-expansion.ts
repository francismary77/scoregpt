import "@/lib/server-only";
import type { FootballIngestionRepository, ProviderRequestRepository } from "./repositories";
import type { ApiFootballProvider } from "./api-football-provider";
import { safeProviderErrorDetails } from "./api-football-provider";

export interface HistoricalLeagueTarget { id: string; providerId: string; providerName: string; country: string; type: "League"; season: string; verifiedSeasonStart?: string; verifiedSeasonEnd?: string; metadataRequestRequired: boolean }
export const historicalLeagueTargets: readonly HistoricalLeagueTarget[] = [
  { id: "premier-league", providerId: "39", providerName: "Premier League", country: "England", type: "League", season: "2024", metadataRequestRequired: true },
  { id: "la-liga", providerId: "140", providerName: "La Liga", country: "Spain", type: "League", season: "2024", metadataRequestRequired: true },
  { id: "serie-a", providerId: "135", providerName: "Serie A", country: "Italy", type: "League", season: "2024", metadataRequestRequired: true },
  { id: "bundesliga", providerId: "78", providerName: "Bundesliga", country: "Germany", type: "League", season: "2024", metadataRequestRequired: true },
  { id: "ligue-1", providerId: "61", providerName: "Ligue 1", country: "France", type: "League", season: "2024", verifiedSeasonStart: "2024-08-16", verifiedSeasonEnd: "2025-05-29", metadataRequestRequired: false },
] as const;

const dayStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
export async function ingestHistoricalLeague(options: { target: HistoricalLeagueTarget; provider: ApiFootballProvider; repository: FootballIngestionRepository; requests: ProviderRequestRepository; dailyBudget: number; now?: Date }) {
  const now = options.now ?? new Date(), categories = options.target.metadataRequestRequired ? ["metadata", "teams", "fixtures"] : ["teams", "fixtures"], estimate = categories.length, used = await options.requests.countRequests(options.provider.name, dayStart(now));
  if (used + estimate > options.dailyBudget) throw new Error("Historical ingestion would exceed the internal daily request budget.");
  const endpoint = `historical-bundle:${options.target.providerId}:${options.target.season}`;
  try {
    const payload = await options.provider.fetchCompetitionData(options.target.providerId, options.target.season, categories);
    const receivedName = payload.competition.name.trim().toLowerCase(), receivedCountry = payload.competition.country?.trim().toLowerCase();
    if (receivedName !== options.target.providerName.toLowerCase() || receivedCountry !== options.target.country.toLowerCase() || (options.target.metadataRequestRequired && payload.competition.providerType !== options.target.type)) throw Object.assign(new Error("Historical competition identity did not match verified mapping."), { name: "ProviderCompetitionIdentityError", requestCount: payload.requestCount });
    payload.competition = { ...payload.competition, name: options.target.providerName, country: options.target.country, providerType: options.target.type, season: options.target.season, enabled: false };
    const counts = await options.repository.ingestBundle(options.provider.name, payload);
    await options.requests.recordRequest({ provider: options.provider.name, category: "competition", endpoint, requestedAt: now.toISOString(), requestCount: payload.requestCount ?? estimate, succeeded: true, cacheState: "missing", refreshReason: "manual", errorCode: null });
    return { status: "completed" as const, target: options.target, counts, requestCount: payload.requestCount ?? estimate };
  } catch (error) {
    const safe = safeProviderErrorDetails(error), requestCount = typeof error === "object" && error && "requestCount" in error && typeof error.requestCount === "number" ? error.requestCount : 1;
    await options.requests.recordRequest({ provider: options.provider.name, category: "competition", endpoint, requestedAt: now.toISOString(), requestCount, succeeded: false, cacheState: "missing", refreshReason: "manual", errorCode: safe.code });
    return { status: "failed" as const, target: options.target, requestCount, error: safe };
  }
}
