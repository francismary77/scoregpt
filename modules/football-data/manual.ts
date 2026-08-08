import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { footballDataConfig } from "@/config/football-data";
import type { Database } from "@/lib/supabase/database.types";
import { SupabaseFootballIngestionRepository, SupabaseProviderRequestRepository } from "@/modules/persistence/football-repositories";
import { ApiFootballProvider } from "./api-football-provider";
import { FootballBootstrapWorkflow } from "./bootstrap";
import type { BootstrapStage } from "./domain";
import { getServerFootballProviderConfig } from "./server-config";
import { FootballDataIngestionService } from "./service";
import { createFootballVerificationReport } from "./verification";
import { discoverScottishPremiership } from "./discovery";
import { runProviderAuthenticationCheck } from "./authentication";

export async function runManualFootballBootstrap(options: {
  privilegedClient: SupabaseClient<Database>;
  stage: BootstrapStage;
  dryRun?: boolean;
  confirmation?: string;
  competitionId?: string;
  categories?: readonly string[];
}) {
  const config = getServerFootballProviderConfig();
  const provider = new ApiFootballProvider({ apiKey: config.apiKey, enabled: config.enabled });
  const repository = new SupabaseFootballIngestionRepository(options.privilegedClient), requests = new SupabaseProviderRequestRepository(options.privilegedClient);
  const ingestion = new FootballDataIngestionService(provider, repository, requests, footballDataConfig.competitions, config.dailyRequestBudget);
  const workflow = new FootballBootstrapWorkflow(provider, repository, ingestion, footballDataConfig.competitions);
  return workflow.run(options.stage, { dryRun: options.dryRun ?? config.dryRun, confirmation: options.confirmation, competitionId: options.competitionId ?? "premier-league", categories: options.categories });
}

export async function runManualFootballVerification(options: { privilegedClient: SupabaseClient<Database>; competitionId?: string }) {
  const config = getServerFootballProviderConfig(), repository = new SupabaseFootballIngestionRepository(options.privilegedClient), requests = new SupabaseProviderRequestRepository(options.privilegedClient);
  return createFootballVerificationReport(repository, requests, footballDataConfig.competitions, options.competitionId ?? "premier-league", "api-football", config.dailyRequestBudget);
}

export async function runManualScottishPremiershipDiscovery(options: { privilegedClient: SupabaseClient<Database>; confirmation: string; season?: string }) {
  const config = getServerFootballProviderConfig(), provider = new ApiFootballProvider({ apiKey: config.apiKey, enabled: config.enabled }), requests = new SupabaseProviderRequestRepository(options.privilegedClient);
  return discoverScottishPremiership({ provider, requests, dailyBudget: config.dailyRequestBudget, confirmation: options.confirmation, season: options.season });
}

export async function runManualProviderAuthenticationCheck(options: { privilegedClient: SupabaseClient<Database>; confirmation: string }) {
  const config = getServerFootballProviderConfig(), provider = new ApiFootballProvider({ apiKey: config.apiKey, enabled: config.enabled }), requests = new SupabaseProviderRequestRepository(options.privilegedClient);
  return runProviderAuthenticationCheck({ provider, requests, dailyBudget: config.dailyRequestBudget, confirmation: options.confirmation });
}
