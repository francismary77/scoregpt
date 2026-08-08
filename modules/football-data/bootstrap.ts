import type { FootballCompetitionConfig } from "@/config/football-data";
import type { FootballDataProvider } from "@/modules/intelligence/providers";
import type { BootstrapPlan, BootstrapPlanItem, BootstrapStage, IngestionResult } from "./domain";
import type { FootballIngestionRepository } from "./repositories";
import { FootballDataIngestionService } from "./service";

const stageCategories: Record<BootstrapStage, readonly string[]> = {
  A: ["metadata", "teams"],
  B: ["fixtures"],
  C: ["results", "standings"],
  D: ["form", "h2h", "injuries", "lineups", "statistics", "odds"],
};

export class FootballBootstrapWorkflow {
  constructor(
    private readonly provider: FootballDataProvider,
    private readonly repository: FootballIngestionRepository,
    private readonly ingestion: FootballDataIngestionService,
    private readonly competitions: readonly FootballCompetitionConfig[],
  ) {}

  async plan(stage: BootstrapStage): Promise<BootstrapPlan> {
    const quota = await this.ingestion.getQuotaStatus(), categories = stageCategories[stage], items: BootstrapPlanItem[] = [];
    for (const competition of this.competitions.slice().sort((a, b) => a.priority - b.priority)) {
      const mapped = Boolean(competition.providerId && competition.currentSeason), eligible = competition.enabled && mapped && stage !== "D";
      const cacheExists = mapped ? await this.repository.hasCompetitionData(this.provider.name, competition.providerId!, competition.currentSeason!) : false;
      const estimatedRequests = eligible ? this.provider.estimateCompetitionRequests?.(categories) ?? categories.length : 0;
      items.push({ stage, competitionId: competition.id, competitionName: competition.name, providerCompetitionId: competition.providerId, categories, cacheExists, estimatedRequests, eligible, reason: stage === "D" ? "Rich fixture data is fetched selectively after persisted fixture review." : !competition.enabled ? "Competition is disabled." : !mapped ? "Provider ID or season is not configured." : cacheExists ? "Persisted competition data exists; freshness must be checked before execution." : "No persisted competition metadata was found." });
    }
    return { dryRun: true, provider: this.provider.name, requestsUsedToday: quota.requestsUsedToday, configuredDailyBudget: quota.configuredDailyBudget, remainingBudget: quota.remainingBudget, estimatedRequests: items.reduce((sum, item) => sum + item.estimatedRequests, 0), items };
  }

  async run(stage: BootstrapStage, options: { dryRun: boolean; confirmation?: string }): Promise<BootstrapPlan | IngestionResult[]> {
    const plan = await this.plan(stage);
    if (options.dryRun) return plan;
    if (options.confirmation !== "CONSUME_PROVIDER_QUOTA") throw new Error("Live bootstrap requires the explicit CONSUME_PROVIDER_QUOTA confirmation.");
    if (!this.provider.enabled) throw new Error("Live football provider is disabled.");
    if (plan.estimatedRequests > plan.remainingBudget) throw new Error("Bootstrap estimate exceeds the remaining internal daily budget.");
    const results: IngestionResult[] = [];
    for (const item of plan.items.filter((entry) => entry.eligible)) results.push(await this.ingestion.ingestCompetition(item.competitionId, "manual", item.categories));
    return results;
  }
}
