import type { FootballCompetitionConfig } from "@/config/football-data";
import type { FootballDataProvider } from "@/modules/intelligence/providers";
import type { BootstrapPlan, BootstrapPlanItem, BootstrapStage, IngestionResult } from "./domain";
import type { FootballIngestionRepository } from "./repositories";
import { FootballDataIngestionService } from "./service";

export const PREMIER_LEAGUE_STAGE_A = { name: "Premier League Bootstrap — Stage A", competitionId: "premier-league", stage: "A" as const, categories: ["metadata", "teams"] as const };
const stageCategories: Record<BootstrapStage, readonly string[]> = { A: PREMIER_LEAGUE_STAGE_A.categories, B: ["fixtures"], C: ["results", "standings"], D: ["form", "h2h", "injuries", "lineups", "statistics", "odds"] };
const quotaWarning = "Provider quota is consumed only during confirmed execution; this preflight makes zero provider requests.";

export class FootballBootstrapWorkflow {
  constructor(private readonly provider: FootballDataProvider, private readonly repository: FootballIngestionRepository, private readonly ingestion: FootballDataIngestionService, private readonly competitions: readonly FootballCompetitionConfig[], private readonly now: () => Date = () => new Date()) {}

  async plan(stage: BootstrapStage, options: { competitionId?: string; categories?: readonly string[] } = {}): Promise<BootstrapPlan> {
    const quota = await this.ingestion.getQuotaStatus(), requested = options.categories ?? stageCategories[stage], invalidCategories = requested.filter((category) => !stageCategories[stage].includes(category)), items: BootstrapPlanItem[] = [];
    const selected = options.competitionId ? this.competitions.filter((item) => item.id === options.competitionId) : this.competitions;
    for (const competition of selected.slice().sort((a, b) => a.priority - b.priority)) {
      const mapped = Boolean(competition.providerId && competition.currentSeason), inspection = mapped ? await this.repository.inspectCompetition(this.provider.name, competition.providerId!, competition.currentSeason!) : null;
      const cacheAge = inspection?.lastFetchedAt ? this.now().getTime() - new Date(inspection.lastFetchedAt).getTime() : Number.POSITIVE_INFINITY;
      const stale = cacheAge > 24 * 60 * 60 * 1000;
      const cachedCategories = requested.filter((category) => category === "metadata" ? Boolean(inspection?.competitionCount) : category === "teams" ? Boolean(inspection?.teamCount) : category === "fixtures" || category === "results" ? Boolean(inspection?.fixtureCount) : inspection?.snapshotCategories.includes(category));
      const staleCategories = stale ? cachedCategories : requested.filter((category) => inspection?.staleCategories.includes(category));
      const categoriesToFetch = requested.filter((category) => !cachedCategories.includes(category) || staleCategories.includes(category));
      const validSeason = Boolean(competition.currentSeason && /^\d{4}$/.test(competition.currentSeason)), validProviderId = Boolean(competition.providerId && /^\d+$/.test(competition.providerId));
      const estimate = competition.enabled && validSeason && validProviderId && stage !== "D" ? this.provider.estimateCompetitionRequests?.(categoriesToFetch) ?? categoriesToFetch.length : 0;
      const blockedReason = invalidCategories.length ? `Stage ${stage} does not permit: ${invalidCategories.join(", ")}.` : !competition.enabled ? "Competition is disabled." : !validProviderId ? "Provider competition ID is missing or invalid." : !validSeason ? "Season must be a four-digit year." : stage === "D" ? "Rich fixture data requires selective fixture-level execution." : estimate > quota.remainingBudget ? "Estimated requests exceed the remaining internal daily budget." : null;
      const allowed = blockedReason === null;
      items.push({ stage, competitionId: competition.id, competitionName: competition.name, providerCompetitionId: competition.providerId, categories: requested, cacheExists: cachedCategories.length > 0, estimatedRequests: estimate, eligible: allowed, reason: blockedReason ?? (estimate === 0 ? "Requested categories are already cached and fresh." : "Preflight passed; explicit confirmation is still required."), season: competition.currentSeason, competitionEnabled: competition.enabled, requestedCategories: requested, providerRequestCategories: categoriesToFetch, cachedCategories, staleCategories, remainingBudgetBefore: quota.remainingBudget, remainingBudgetAfter: Math.max(0, quota.remainingBudget - estimate), allowed, blockedReason, quotaWarning });
    }
    return { dryRun: true, provider: this.provider.name, requestsUsedToday: quota.requestsUsedToday, configuredDailyBudget: quota.configuredDailyBudget, remainingBudget: quota.remainingBudget, estimatedRequests: items.reduce((sum, item) => sum + item.estimatedRequests, 0), items };
  }

  async run(stage: BootstrapStage, options: { dryRun: boolean; confirmation?: string; competitionId?: string; categories?: readonly string[] }): Promise<BootstrapPlan | IngestionResult[]> {
    const plan = await this.plan(stage, options);
    if (options.dryRun) return plan;
    if (options.confirmation !== "CONSUME_PROVIDER_QUOTA") throw new Error("Live bootstrap requires the explicit CONSUME_PROVIDER_QUOTA confirmation.");
    if (!this.provider.enabled) throw new Error("Live football provider is disabled.");
    if (!this.provider.credentialConfigured) throw new Error("Live football provider credential is not configured.");
    if (!plan.items.length) throw new Error("The requested competition is not configured.");
    const blocked = plan.items.find((item) => !item.allowed);
    if (blocked) throw new Error(blocked.blockedReason ?? "Bootstrap preflight blocked execution.");
    if (plan.estimatedRequests > plan.remainingBudget) throw new Error("Bootstrap estimate exceeds the remaining internal daily budget.");
    const results: IngestionResult[] = [];
    for (const item of plan.items) {
      if (!item.providerRequestCategories.length) { results.push({ status: "cache-hit", provider: this.provider.name, competitions: 0, teams: 0, fixtures: 0, snapshots: 0, reason: "Requested categories are already cached and fresh." }); continue; }
      results.push(await this.ingestion.ingestCompetition(item.competitionId, "manual", item.providerRequestCategories));
    }
    return results;
  }
}
