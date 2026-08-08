import type { SupabaseClient } from "@supabase/supabase-js";
import { featureFlags } from "@/config/application";
import type { Database } from "@/lib/supabase/database.types";
import { MockMembershipRepository, MockPredictionUsageRepository, MockProfileRepository } from "@/modules/account/repositories";
import { MockPlatformOrderRepository } from "@/modules/billing/repositories";
import {
  SupabaseFootballCacheRepository,
  SupabaseMembershipRepository,
  SupabasePlatformOrderRepository,
  SupabasePredictionUsageRepository,
  SupabaseProfileRepository,
  SupabaseStoredIntelligenceRepository,
} from "./repositories";

export function createPersistenceRepositories(client?: SupabaseClient<Database>) {
  if (!featureFlags.useSupabasePersistence || !client) {
    return {
      mode: "mock" as const,
      membership: new MockMembershipRepository(),
      predictionUsage: new MockPredictionUsageRepository(),
      profile: new MockProfileRepository(),
      platformOrders: new MockPlatformOrderRepository(),
      footballCache: null,
      storedIntelligence: null,
    };
  }

  return {
    mode: "supabase" as const,
    membership: new SupabaseMembershipRepository(client),
    predictionUsage: new SupabasePredictionUsageRepository(client),
    profile: new SupabaseProfileRepository(client),
    platformOrders: new SupabasePlatformOrderRepository(client),
    footballCache: new SupabaseFootballCacheRepository(client),
    storedIntelligence: new SupabaseStoredIntelligenceRepository(client),
  };
}
