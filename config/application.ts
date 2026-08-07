export const featureFlags = {
  useMockFootballData: true,
  liveFootballDataEnabled: false,
  aiGenerationEnabled: false,
  authenticationEnabled: true,
  paymentsEnabled: false,
  telegramEnabled: false,
  businessEditionModulesEnabled: false,
} as const;

export const applicationConfig = {
  displayTimezone: "Africa/Lagos",
  defaultResultLimit: 8,
  featuredContentEnabled: true,
  dataMode: "mock" as const,
  supportedCompetitionIds: ["premier-league", "champions-league", "la-liga", "serie-a", "bundesliga"],
} as const;

export const authConfig = { mode:"mock" as const, liveAuthEnabled:false };
export const entitlementConfig = { freePredictionAllowance:3, allowancePeriod:"lifetime-welcome" as const };
