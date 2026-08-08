import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/config/brand";
import { AuthStateProvider } from "@/components/auth-state-provider";
import { getServerUser } from "@/modules/account/server";
import { getSiteUrl } from "@/config/site";

const siteUrl=getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${brand.siteName} — ${brand.tagline}`, template: `%s | ${brand.siteName}` },
  description: "Transparent AI-powered football match intelligence, confidence scoring and public results.",
  icons: { icon: brand.favicon, shortcut: brand.favicon },
  openGraph: {
    title: `${brand.siteName} — ${brand.tagline}`,
    description: "Transparent, data-driven football match intelligence explained by AI.",
    url: siteUrl,
    siteName: brand.siteName,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${brand.siteName} football intelligence platform` }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user=await getServerUser();
  const initialState=user?{status:"authenticated" as const,user,session:{id:"server-session",userId:user.id,createdAt:user.createdAt,mode:"supabase" as const}}:{status:"guest" as const};
  return <html lang="en"><body><AuthStateProvider initialState={initialState}>{children}</AuthStateProvider></body></html>;
}
