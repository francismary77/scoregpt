import type { NormalizedSnapshot } from "@/modules/football-data/domain";

export const ADAPTIVE_ENRICHMENT_MAX_FIXTURES = 25;
export const ADAPTIVE_ENRICHMENT_MAX_REQUESTS = 250;
export const ADAPTIVE_ENRICHMENT_RECENT_FINISHED_HOURS = 24;

export type EnrichmentCategory = Extract<NormalizedSnapshot["category"], "h2h" | "form" | "standings" | "injuries" | "odds" | "lineups" | "statistics">;
const ALL: readonly EnrichmentCategory[] = ["h2h", "form", "standings", "injuries", "odds", "lineups", "statistics"];

export function enrichmentCategories(status: string, hoursUntilKickoff: number): { requested: EnrichmentCategory[]; notExpected: EnrichmentCategory[] } {
  let requested: EnrichmentCategory[] = [];
  if (status === "scheduled" && hoursUntilKickoff >= 0) {
    requested = ["h2h", "form", "standings"];
    if (hoursUntilKickoff <= 72) requested.push("injuries", "odds");
    if (hoursUntilKickoff <= 1.5) requested.push("lineups");
  } else if (status === "live") requested = ["lineups", "statistics"];
  else if (status === "finished" && hoursUntilKickoff >= -ADAPTIVE_ENRICHMENT_RECENT_FINISHED_HOURS) requested = ["statistics"];
  return { requested, notExpected: ALL.filter((category) => !requested.includes(category)) };
}