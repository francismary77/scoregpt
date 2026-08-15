import "../../lib/server-only.ts";
import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleSupabaseConfig } from "../../lib/supabase/server-environment.ts";
import { SupabaseFootballExperienceRepository } from "./repository";
import { FootballExperienceService } from "./service";

export function createPrivilegedFootballExperienceService() {
  const { url, serviceRoleKey } = requireServiceRoleSupabaseConfig();
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return new FootballExperienceService(new SupabaseFootballExperienceRepository(client));
}
