import type { SupabaseClient } from "@supabase/supabase-js";
import { footballDataConfig } from "@/config/football-data";
import type { Database } from "@/lib/supabase/database.types";
import { SupabaseFootballIngestionRepository, SupabaseProviderRequestRepository } from "@/modules/persistence/football-repositories";
import type { FootballDataProvider } from "@/modules/intelligence/providers";
import { MemoryFootballIngestionRepository, MemoryProviderRequestRepository } from "./memory-repositories";
import { DisabledFootballDataProvider } from "./providers";
import { FootballDataIngestionService } from "./service";

export function createFootballDataIngestion(options: { client?: SupabaseClient<Database>; provider?: FootballDataProvider } = {}) {
  const provider = options.provider ?? new DisabledFootballDataProvider();
  const repository = options.client ? new SupabaseFootballIngestionRepository(options.client) : new MemoryFootballIngestionRepository();
  const requests = options.client ? new SupabaseProviderRequestRepository(options.client) : new MemoryProviderRequestRepository();
  return new FootballDataIngestionService(provider, repository, requests, footballDataConfig.competitions, footballDataConfig.dailyRequestBudget);
}
