import "@/lib/server-only";
import type { ApiFootballProvider, ApiFootballCompetitionCandidate } from "./api-football-provider";
import { safeProviderErrorDetails } from "./api-football-provider";
import type { ProviderRequestRepository } from "./repositories";

export interface VerifiedCompetitionMapping { competitionName: string; country: string; competitionType: string | null; providerCompetitionId: string; season: string; seasonStart: string; seasonEnd: string; requestCount: 1 }

function dayStart(now: Date) { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString(); }
function coversAugust(candidate: ApiFootballCompetitionCandidate, year: string) { return candidate.seasons.filter((season) => season.year === year && season.start && season.end && new Date(season.start) <= new Date(`${year}-08-09T23:59:59Z`) && new Date(season.end) >= new Date(`${year}-08-08T00:00:00Z`)); }

export async function discoverScottishPremiership(options: { provider: ApiFootballProvider; requests: ProviderRequestRepository; dailyBudget: number; confirmation: string; season?: string; now?: Date }): Promise<VerifiedCompetitionMapping> {
  const now = options.now ?? new Date(), since = dayStart(now), used = await options.requests.countRequests(options.provider.name, since);
  const requestedSeason = options.season ?? "2026";
  if (!/^\d{4}$/.test(requestedSeason)) throw new Error("Discovery season must be a four-digit year.");
  if (options.confirmation !== "DISCOVER_SCOTTISH_PREMIERSHIP") throw new Error("Scottish Premiership discovery requires explicit confirmation.");
  if (!options.provider.enabled) throw new Error("Live football provider is disabled.");
  if (!options.provider.credentialConfigured) throw new Error("Live football provider credential is not configured.");
  if (used + 1 > options.dailyBudget) throw new Error("League discovery would exceed the internal daily request budget.");
  const requestedAt = now.toISOString();
  try {
    const candidates = await options.provider.discoverCompetitions({ country: "Scotland", season: requestedSeason });
    const matches = candidates.flatMap((candidate) => {
      const identityMatches = candidate.country.toLowerCase() === "scotland" && /^(scottish )?premiership$/i.test(candidate.name.trim());
      return identityMatches ? coversAugust(candidate, requestedSeason).map((season) => ({ candidate, season })) : [];
    });
    if (matches.length !== 1) throw new Error(matches.length ? "Scottish Premiership discovery was ambiguous." : `Scottish Premiership discovery returned no unambiguous August ${requestedSeason} season.`);
    const [{ candidate, season }] = matches;
    await options.requests.recordRequest({ provider: options.provider.name, category: "competition", endpoint: `leagues-discovery:scotland-premiership-${requestedSeason}`, requestedAt, requestCount: 1, succeeded: true, cacheState: "missing", refreshReason: "manual", errorCode: null });
    return { competitionName: candidate.name, country: candidate.country, competitionType: candidate.type, providerCompetitionId: candidate.providerId, season: season.year, seasonStart: season.start, seasonEnd: season.end, requestCount: 1 };
  } catch (error) {
    await options.requests.recordRequest({ provider: options.provider.name, category: "competition", endpoint: `leagues-discovery:scotland-premiership-${requestedSeason}`, requestedAt, requestCount: 1, succeeded: false, cacheState: "missing", refreshReason: "manual", errorCode: safeProviderErrorDetails(error).code });
    throw error;
  }
}
