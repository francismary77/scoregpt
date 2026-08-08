export const brand = {
  siteName: "9ja Football AI",
  shortName: "9FAI",
  tagline: "AI-Powered Football Predictions & Intelligence",
  companyName: "FABRO TECH LIMITED",
  domain: "9jafootballai.com.ng",
  logo: null,
  favicon: "/favicon.svg",
  primaryAccent: "#19E6C3",
  secondaryAccent: "#2DA8FF",
  supportEmail: "hello@9jafootballai.com.ng",
  contactPhone: "+234 810 501 6931",
  whatsappNumber: "2348105016931",
  socialLinks: { x: "#", instagram: "#", facebook: "#" },
  salesPageUrl: "/sales",
  poweredByBrand: false,
  currency: "NGN",
  defaultCountry: "Nigeria",
  businessSalesMarketingEnabled: true,
} as const;

export function whatsappUrl(message:string){return `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(message)}`}

export type BrandConfig = typeof brand;
