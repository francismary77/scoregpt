export type RefreshPriority = "critical" | "high" | "normal" | "low";

export interface FootballCompetitionConfig {
  id: string;
  providerId: string;
  currentSeason: string;
  enabled: boolean;
  priority: number;
  refreshPriority: RefreshPriority;
}

export const footballCompetitions: readonly FootballCompetitionConfig[] = [
  { id: "premier-league", providerId: "39", currentSeason: "2026", enabled: true, priority: 10, refreshPriority: "critical" },
  { id: "champions-league", providerId: "2", currentSeason: "2026", enabled: true, priority: 20, refreshPriority: "high" },
  { id: "la-liga", providerId: "140", currentSeason: "2026", enabled: true, priority: 30, refreshPriority: "high" },
  { id: "serie-a", providerId: "135", currentSeason: "2026", enabled: true, priority: 40, refreshPriority: "normal" },
  { id: "bundesliga", providerId: "78", currentSeason: "2026", enabled: true, priority: 50, refreshPriority: "normal" },
] as const;

export const footballFreshness = {
  staticHours: 24,
  upcomingHours: 6,
  nearMatchMinutes: 45,
  liveSeconds: 45,
  finished: "durable",
} as const;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const footballDataConfig = {
  provider: process.env.FOOTBALL_DATA_PROVIDER?.trim() || "disabled",
  liveProviderEnabled: process.env.FOOTBALL_DATA_PROVIDER_ENABLED === "true",
  dailyRequestBudget: positiveInteger(process.env.FOOTBALL_API_DAILY_REQUEST_BUDGET, 100),
  competitions: footballCompetitions,
} as const;

export function getConfiguredCompetition(id: string): FootballCompetitionConfig | undefined {
  return footballCompetitions.find((competition) => competition.id === id);
}
