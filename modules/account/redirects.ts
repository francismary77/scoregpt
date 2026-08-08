import { getSiteUrl } from "@/config/site";
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try { const origin=getSiteUrl();const url = new URL(value, origin); return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback; }
  catch { return fallback; }
}
