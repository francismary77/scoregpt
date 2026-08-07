export const founderOffer = {
  label: "Founder Launch Offer",
  endsOn: "31 August 2026",
  clientLimit: 10,
  disclaimer: "Available until 31 August 2026 or until the first 10 client platforms are secured, whichever comes first.",
} as const;

export const businessPackages = [
  {
    id: "launch",
    name: "Launch Edition",
    audience: "For creators and growing prediction brands.",
    standardPrice: 500000,
    founderPrice: 350000,
    platformCareMonthly: 12000,
    typicalDelivery: "7–14 Working Days",
    deliveryNote: "Delivery begins after the initial payment and all required branding/content materials have been received.",
    whatsappMessage: "Hello FABRO TECH LIMITED, I am interested in the ScoreGPT Launch Edition. I have a few questions before proceeding.",
    attribution: true,
    features: [
      "Professionally branded AI football prediction website",
      "Own domain connection",
      "Managed hosting for the first 12 months",
      "Football data integration",
      "AI-powered prediction and intelligence engine",
      "Match analysis pages",
      "User registration-ready architecture",
      "Membership-ready architecture",
      "Results tracking",
      "Responsible gaming pages",
      "Responsive mobile design",
      "Payment integration setup during the backend phase",
      "Technical deployment and basic support",
      '“Powered by ScoreGPT” attribution',
    ],
  },
  {
    id: "business",
    name: "Business Edition",
    audience: "For established prediction businesses and larger communities.",
    standardPrice: 1000000,
    founderPrice: 750000,
    platformCareMonthly: 18000,
    typicalDelivery: "14–21 Working Days",
    deliveryNote: "Business Edition delivery depends on the selected modules, branding requirements and any agreed custom configuration.",
    whatsappMessage: "Hello FABRO TECH LIMITED, I am interested in the ScoreGPT Business Edition. I would like to discuss my platform requirements.",
    attribution: false,
    features: [
      "Everything included in Launch Edition",
      "White-label presentation without ScoreGPT attribution",
      "Multiple administrators",
      "Telegram prediction notifications",
      "Advanced analytics and richer football statistics",
      "Multiple competition support",
      "Premium branding and custom homepage options",
      "Priority support",
      "Future Business Edition modules while Platform Care remains active",
    ],
    capabilityNote: "Business modules are configured or built for each customer as part of their deployment; they are not presented as currently active ScoreGPT consumer features.",
  },
] as const;

export const platformCare = {
  startsAfterMonths: 12,
  includes: ["Managed hosting", "Football data access", "AI service usage within fair-use limits", "Security updates", "Backups", "Software updates", "Technical support", "Minor platform improvements"],
  exclusions: "Major redesigns, custom one-off features, third-party integrations and unusually heavy usage may require separate quotations.",
} as const;

export const commercialJourney = {
  generalWhatsAppMessage:"Hello FABRO TECH LIMITED, I am interested in launching my own AI Football Prediction Platform and I have a few questions.",
  deliveryDisclaimer:"Delivery timelines may be affected by delays in receiving client materials, domain/DNS changes, third-party approvals, payment-provider approvals or additional custom requirements.",
  clientRequirements:["Brand or platform name","Logo","Preferred brand colours","Domain details, if already owned","Business contact information","Preferred subscription pricing","Social links","Package-specific requirements"],
} as const;

export const consumerPlans = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    description: "A clear introduction to AI-powered football predictions.",
    features: ["Registration", "Limited free prediction access", "Public results access", "Basic match intelligence"],
    cta: "Try Free Prediction",
    href: "/register",
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 3000,
    workingPrice: true,
    description: "Deeper daily intelligence for members who want the full analysis.",
    features: ["Broader prediction access", "Full AI reasoning", "Confidence and risk breakdowns", "Premium match analysis", "Full daily prediction access", "Results history"],
    cta: "Join Premium Waitlist",
    href: "/register",
  },
] as const;

export function formatNaira(value: number) {
  return `₦${new Intl.NumberFormat("en-NG").format(value)}`;
}
