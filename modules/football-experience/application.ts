import { featureFlags } from "@/config/application";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseFootballExperienceRepository } from "./repository";
import { FootballExperienceService } from "./service";

export async function createFootballExperienceService() {
  if (!featureFlags.useSupabasePersistence || !getSupabasePublicConfig()) return new FootballExperienceService(null);
  return new FootballExperienceService(new SupabaseFootballExperienceRepository(await createSupabaseServerClient()));
}
