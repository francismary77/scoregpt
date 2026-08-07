export const brand = {
  siteName: "ScoreGPT",
  shortName: "SG",
  tagline: "Football Intelligence Powered by AI",
  companyName: "FABRO TECH LIMITED",
  domain: "ScoreGPT.com.ng",
  logo: null,
  favicon: "/favicon.svg",
  primaryAccent: "#19E6C3",
  secondaryAccent: "#2DA8FF",
  supportEmail: "hello@scoregpt.com.ng",
  contactPhone: "+234 810 501 6931",
  whatsappNumber: "2348105016931",
  socialLinks: { x: "#", instagram: "#", facebook: "#" },
  salesPageUrl: "/sales",
  poweredByScoreGPT: false,
  currency: "NGN",
  defaultCountry: "Nigeria",
  businessSalesMarketingEnabled: true,
} as const;

export function whatsappUrl(message:string){return `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(message)}`}

export type BrandConfig = typeof brand;
