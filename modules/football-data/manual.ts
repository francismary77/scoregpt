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

export async function runManualFootballBootstrap(options: {
  privilegedClient: SupabaseClient<Database>;
  stage: BootstrapStage;
  dryRun?: boolean;
  confirmation?: string;
}) {
  const config = getServerFootballProviderConfig();
  const provider = new ApiFootballProvider({ apiKey: config.apiKey, enabled: config.enabled });
  const repository = new SupabaseFootballIngestionRepository(options.privilegedClient), requests = new SupabaseProviderRequestRepository(options.privilegedClient);
  const ingestion = new FootballDataIngestionService(provider, repository, requests, footballDataConfig.competitions, config.dailyRequestBudget);
  const workflow = new FootballBootstrapWorkflow(provider, repository, ingestion, footballDataConfig.competitions);
  return workflow.run(options.stage, { dryRun: options.dryRun ?? config.dryRun, confirmation: options.confirmation });
}
