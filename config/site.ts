export const PRODUCTION_SITE_URL = "https://scoregpt.com.ng";
export const DEVELOPMENT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string): string {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Site URL must use HTTP or HTTPS.");
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeSiteUrl(configured);
  return process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL;
}

export function getAuthRedirectUrl(path: string): string {
  const localOrigin = typeof window !== "undefined" && /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)
    ? window.location.origin
    : getSiteUrl();
  return new URL(path, localOrigin).toString();
}
