import "@/lib/server-only";
import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleSupabaseConfig } from "./server-environment";
import type { Database } from "./database.types";
export function createPrivilegedSupabaseClient(env:NodeJS.ProcessEnv=process.env){const config=requireServiceRoleSupabaseConfig(env);return createClient<Database>(config.url,config.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}})}
