import "@/lib/server-only";
import type { ApiFootballProvider } from "./api-football-provider";
import { safeProviderErrorDetails } from "./api-football-provider";
import type { ProviderRequestRepository } from "./repositories";

export async function runProviderAuthenticationCheck(options: { provider: ApiFootballProvider; requests: ProviderRequestRepository; dailyBudget: number; confirmation: string; now?: Date }) {
  const now = options.now ?? new Date(), since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString(), used = await options.requests.countRequests(options.provider.name, since);
  if (options.confirmation !== "CHECK_API_FOOTBALL_AUTH") throw new Error("Provider authentication check requires explicit confirmation.");
  if (!options.provider.enabled) throw new Error("Live football provider is disabled.");
  if (!options.provider.credentialConfigured) throw new Error("Live football provider credential is not configured.");
  if (used + 1 > options.dailyBudget) throw new Error("Authentication check would exceed the internal daily request budget.");
  try {
    const result = await options.provider.checkAuthentication();
    await options.requests.recordRequest({ provider: options.provider.name, category: "competition", endpoint: "status-authentication-check", requestedAt: now.toISOString(), requestCount: 1, succeeded: true, cacheState: "missing", refreshReason: "manual", errorCode: null });
    return { ...result, requestCount: 1 as const };
  } catch (error) {
    await options.requests.recordRequest({ provider: options.provider.name, category: "competition", endpoint: "status-authentication-check", requestedAt: now.toISOString(), requestCount: 1, succeeded: false, cacheState: "missing", refreshReason: "manual", errorCode: safeProviderErrorDetails(error).code });
    throw error;
  }
}
