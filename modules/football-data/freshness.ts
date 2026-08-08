import { footballFreshness } from "@/config/football-data";
import type { MatchStatus } from "@/modules/intelligence/domain";
import type { CacheState, FootballDataCategory } from "./domain";

const STATIC_CATEGORIES = new Set<FootballDataCategory>(["competition", "season", "team"]);

export function freshnessLifetimeMs(category: FootballDataCategory, status: MatchStatus, kickoffAt: string, now = new Date()): number | null {
  if (status === "finished" || status === "cancelled") return null;
  if (status === "live") return footballFreshness.liveSeconds * 1_000;
  if (STATIC_CATEGORIES.has(category)) return footballFreshness.staticHours * 3_600_000;
  const untilKickoff = new Date(kickoffAt).getTime() - now.getTime();
  if (untilKickoff <= 2 * 3_600_000 && untilKickoff >= -2 * 3_600_000) return footballFreshness.nearMatchMinutes * 60_000;
  return footballFreshness.upcomingHours * 3_600_000;
}

export function expiresAtFor(category: FootballDataCategory, status: MatchStatus, kickoffAt: string, fetchedAt: string): string | null {
  const fetched = new Date(fetchedAt);
  const lifetime = freshnessLifetimeMs(category, status, kickoffAt, fetched);
  return lifetime === null ? null : new Date(fetched.getTime() + lifetime).toISOString();
}

export function cacheState(expiresAt: string | null, now = new Date()): CacheState {
  if (!expiresAt) return "fresh";
  return new Date(expiresAt).getTime() > now.getTime() ? "fresh" : "stale";
}
