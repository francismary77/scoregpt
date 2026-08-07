export interface Announcement {
  id: string;
  icon: string;
  message: string;
  cta: string;
  href: string;
}

import { businessPackages, founderOffer, formatNaira } from "./pricing";

export const businessMarketing = {
  announcementsEnabled: true,
  announcements: [
    { id: "launch", icon: "↗", message: `Launch your own AI Football Prediction Platform from ${formatNaira(businessPackages[0].founderPrice)}`, cta: "View Business Packages →", href: "/sales" },
    { id: "predict", icon: "⚽", message: "Experience AI-powered football predictions", cta: "Try Free Prediction →", href: "/register" },
    { id: "founder", icon: "◆", message: `${founderOffer.label} ends ${founderOffer.endsOn}`, cta: "Launch Your Platform →", href: "/sales" },
    { id: "business", icon: "▣", message: "Build your own football prediction business with FABRO TECH LIMITED", cta: "See How It Works →", href: "/sales" },
  ] satisfies Announcement[],
} as const;
