import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requireSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const { url, publishableKey } = requireSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Auth routes will own refresh writes in Batch 4B.
        }
      },
    },
  });
}
