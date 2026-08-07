import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domain.toLowerCase()}`),
  title: { default: `${brand.siteName} — ${brand.tagline}`, template: `%s | ${brand.siteName}` },
  description: "Transparent AI-powered football match intelligence, confidence scoring and public results.",
  icons: { icon: brand.favicon, shortcut: brand.favicon },
  openGraph: {
    title: `${brand.siteName} — ${brand.tagline}`,
    description: "Transparent, data-driven football match intelligence explained by AI.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${brand.siteName} football intelligence platform` }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
