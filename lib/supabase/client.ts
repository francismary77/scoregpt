"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig, requireSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const { url, publishableKey } = requireSupabasePublicConfig();
  browserClient = createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  return getSupabasePublicConfig() ? createSupabaseBrowserClient() : null;
}
