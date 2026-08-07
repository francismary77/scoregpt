export const featureFlags = {
  useMockFootballData: true,
  liveFootballDataEnabled: false,
  aiGenerationEnabled: false,
  authenticationEnabled: false,
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
