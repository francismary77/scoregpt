import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/modules/account/redirects";

export async function GET(request: Request) {
  const url = new URL(request.url), tokenHash = url.searchParams.get("token_hash"), type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(url.searchParams.get("next"));
  if (!tokenHash || !type) return NextResponse.redirect(new URL("/login?error=invalid-auth-link", url.origin));
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
  return NextResponse.redirect(new URL(error ? "/login?error=invalid-auth-link" : next, url.origin));
}
