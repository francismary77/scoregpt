"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPersistenceRepositories } from "./application";

export function createBrowserPersistenceRepositories() {
  return createPersistenceRepositories(getSupabaseBrowserClient() ?? undefined);
}
