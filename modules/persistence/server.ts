import { featureFlags } from "@/config/application";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPersistenceRepositories } from "./application";

export async function createServerPersistenceRepositories() {
  if (!featureFlags.useSupabasePersistence || !getSupabasePublicConfig()) {
    return createPersistenceRepositories();
  }
  return createPersistenceRepositories(await createSupabaseServerClient());
}
