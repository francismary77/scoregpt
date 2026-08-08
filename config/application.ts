import { footballDataConfig } from "./football-data";

export const featureFlags = {
  useMockFootballData: true,
  liveFootballDataEnabled: footballDataConfig.liveProviderEnabled,
  aiGenerationEnabled: false,
  authenticationEnabled: true,
  paymentsEnabled: false,
  telegramEnabled: false,
  businessEditionModulesEnabled: false,
  useSupabasePersistence: process.env.NEXT_PUBLIC_DATA_REPOSITORY === "supabase",
} as const;

export const applicationConfig = {
  displayTimezone: "Africa/Lagos",
  defaultResultLimit: 8,
  featuredContentEnabled: true,
  dataMode: "mock" as const,
  supportedCompetitionIds: ["premier-league", "champions-league", "la-liga", "serie-a", "bundesliga"],
} as const;

export const authConfig = {
  mode: process.env.NEXT_PUBLIC_AUTH_PROVIDER === "mock" ? "mock" as const : "supabase" as const,
  liveAuthEnabled: process.env.NEXT_PUBLIC_AUTH_PROVIDER !== "mock",
};
export const entitlementConfig = { freePredictionAllowance:3, allowancePeriod:"lifetime-welcome" as const };
