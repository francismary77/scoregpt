import "@/lib/server-only";
import type { FootballCompetitionConfig } from "@/config/football-data";
import type { FootballVerificationReport } from "./domain";
import type { FootballIngestionRepository, ProviderRequestRepository } from "./repositories";

export async function createFootballVerificationReport(repository: FootballIngestionRepository, requests: ProviderRequestRepository, competitions: readonly FootballCompetitionConfig[], competitionId: string, provider = "api-football", dailyBudget = 6_500, now: Date = new Date()): Promise<FootballVerificationReport> {
  const competition = competitions.find((item) => item.id === competitionId);
  if (!competition) throw new Error("The requested competition is not configured.");
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const inspection = competition.providerId && competition.currentSeason ? await repository.inspectCompetition(provider, competition.providerId, competition.currentSeason) : { competitionCount: 0, teamCount: 0, fixtureCount: 0, snapshotCategories: [], freshCategories: [], staleCategories: [], providerReferences: [], lastFetchedAt: null, duplicateWarnings: [], malformedWarnings: ["Provider ID or season is not configured."] };
  const [quota, requestAuditRows] = await Promise.all([requests.getQuotaStatus(provider, since, dailyBudget), requests.countAuditRows(provider, since)]);
  return { ...inspection, provider, competitionId, competitionName: competition.name, providerCompetitionId: competition.providerId, season: competition.currentSeason, requestAuditRows, requestsUsedToday: quota.requestsUsedToday, configuredDailyBudget: quota.configuredDailyBudget, remainingBudget: quota.remainingBudget, providerCallsMade: 0 };
}
