import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { User, UserRole } from "./domain";
import { safeRedirectPath } from "./redirects";

export async function getServerUser(): Promise<User | null> {
  if (!getSupabasePublicConfig()) return null;
  const client = await createSupabaseServerClient();
  const { data: authData, error } = await client.auth.getUser();
  if (error || !authData.user) return null;
  const { data: profile } = await client.from("profiles").select("display_name,role").eq("user_id", authData.user.id).maybeSingle();
  return { id: authData.user.id, email: authData.user.email ?? "", displayName: profile?.display_name ?? String(authData.user.user_metadata.display_name ?? "Member"), createdAt: authData.user.created_at, role: (profile?.role ?? "user") as UserRole };
}

export async function requireServerUser(returnTo: string, admin = false): Promise<User> {
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeRedirectPath(returnTo, "/dashboard"))}`);
  if (admin && user.role !== "admin") redirect("/dashboard?notice=admin-access-denied");
  return user;
}
