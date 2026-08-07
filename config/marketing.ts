export interface Announcement {
  id: string;
  icon: string;
  message: string;
  cta: string;
  href: string;
}

export const businessMarketing = {
  announcementsEnabled: true,
  announcements: [
    { id: "launch", icon: "↗", message: "Launch your own AI Football Prediction Platform from ₦350,000", cta: "View Business Packages →", href: "/sales" },
    { id: "predict", icon: "⚽", message: "Experience AI-powered football predictions", cta: "Try Free Prediction →", href: "/register" },
    { id: "founder", icon: "◆", message: "Founder Launch Offer ends 31 August", cta: "Launch Your Platform →", href: "/sales" },
    { id: "business", icon: "▣", message: "Build your own football prediction business with FABRO TECH LIMITED", cta: "See How It Works →", href: "/sales" },
  ] satisfies Announcement[],
} as const;
