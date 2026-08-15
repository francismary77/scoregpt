export type RefreshPriority = "critical" | "high" | "normal" | "low";
export type CompetitionDataCategory = "metadata" | "teams" | "fixtures" | "results" | "standings" | "form" | "h2h" | "injuries" | "lineups" | "statistics" | "odds";

export interface FootballCompetitionConfig {
  id: string;
  providerId: string | null;
  name: string;
  country: string;
  currentSeason: string | null;
  enabled: boolean;
  homepageFeatured: boolean;
  priority: number;
  refreshPriority: RefreshPriority;
  dataCategories: readonly CompetitionDataCategory[];
  providerName?: string;
  providerType?: "League" | "Cup";
  providerVerified?: boolean;
}

export interface HistoricalFootballCompetitionMapping { id: string; providerId: string; providerName: string; name: string; country: string; season: string; purpose: "development-history" }

export const historicalFootballCompetitionMappings: readonly HistoricalFootballCompetitionMapping[] = [
  { id: "scottish-premiership", providerId: "179", providerName: "Premiership", name: "Scottish Premiership", country: "Scotland", season: "2024", purpose: "development-history" },
] as const;

const coreCategories = ["metadata", "teams", "fixtures", "results", "standings"] as const;

export const footballCompetitions: readonly FootballCompetitionConfig[] = [
  { id: "premier-league", providerId: "39", providerName: "Premier League", providerType: "League", providerVerified: true, name: "Premier League", country: "England", currentSeason: "2026", enabled: true, homepageFeatured: true, priority: 10, refreshPriority: "critical", dataCategories: coreCategories },
  { id: "champions-league", providerId: "2", name: "UEFA Champions League", country: "Europe", currentSeason: "2026", enabled: false, homepageFeatured: true, priority: 20, refreshPriority: "high", dataCategories: coreCategories },
  { id: "la-liga", providerId: "140", providerName: "La Liga", providerType: "League", providerVerified: true, name: "La Liga", country: "Spain", currentSeason: "2026", enabled: true, homepageFeatured: true, priority: 30, refreshPriority: "high", dataCategories: coreCategories },
  { id: "serie-a", providerId: "135", providerName: "Serie A", providerType: "League", providerVerified: true, name: "Serie A", country: "Italy", currentSeason: "2026", enabled: true, homepageFeatured: false, priority: 40, refreshPriority: "normal", dataCategories: coreCategories },
  { id: "bundesliga", providerId: "78", providerName: "Bundesliga", providerType: "League", providerVerified: true, name: "Bundesliga", country: "Germany", currentSeason: "2026", enabled: true, homepageFeatured: false, priority: 50, refreshPriority: "normal", dataCategories: coreCategories },
  // Provider-verified current season: 31 July 2026 to 10 April 2027. The 2024 development mapping remains above for historical evidence.
  { id: "scottish-premiership", providerId: "179", providerName: "Premiership", providerType: "League", providerVerified:true,name: "Scottish Premiership", country: "Scotland", currentSeason: "2026", enabled: true, homepageFeatured: false, priority: 55, refreshPriority: "high", dataCategories: coreCategories },
  { id: "ligue-1", providerId: "61", providerName: "Ligue 1", providerType: "League", providerVerified: true, name: "Ligue 1", country: "France", currentSeason: "2026", enabled: true, homepageFeatured: false, priority: 56, refreshPriority: "normal", dataCategories: coreCategories },
  { id: "turkish-super-lig", providerId: "203", providerName: "Süper Lig", providerType: "League", providerVerified: true, name: "Turkish Süper Lig", country: "Turkey", currentSeason: "2026", enabled: true, homepageFeatured: false, priority: 57, refreshPriority: "normal", dataCategories: coreCategories },
  ...[
    ["europa-league", "UEFA Europa League", "Europe"], ["conference-league", "UEFA Conference League", "Europe"], ["fa-cup", "FA Cup", "England"], ["efl-cup", "EFL Cup", "England"], ["championship", "EFL Championship", "England"],
    ["eredivisie", "Eredivisie", "Netherlands"], ["primeira-liga", "Primeira Liga", "Portugal"], ["belgian-pro-league", "Belgian Pro League", "Belgium"],
    ["saudi-pro-league", "Saudi Pro League", "Saudi Arabia"], ["mls", "Major League Soccer", "United States"], ["brasileirao", "Brasileirão Série A", "Brazil"], ["argentine-primera", "Argentine Primera División", "Argentina"],
    ["afcon", "Africa Cup of Nations", "Africa"], ["caf-champions-league", "CAF Champions League", "Africa"], ["world-cup", "FIFA World Cup", "International"], ["world-cup-qualifiers-africa", "World Cup Qualifiers — Africa", "Africa"], ["euros", "UEFA European Championship", "Europe"],
    ["copa-america", "Copa América", "South America"], ["uefa-nations-league", "UEFA Nations League", "Europe"], ["club-world-cup", "FIFA Club World Cup", "International"], ["nigeria-premier-league", "Nigeria Premier Football League", "Nigeria"], ["women-champions-league", "UEFA Women's Champions League", "Europe"],
  ].map(([id, name, country], index): FootballCompetitionConfig => ({ id, providerId: null, name, country, currentSeason: null, enabled: false, homepageFeatured: false, priority: 60 + index * 10, refreshPriority: "low", dataCategories: coreCategories })),
] as const;

export const footballFreshness = { staticHours: 24, upcomingHours: 6, nearMatchMinutes: 45, liveSeconds: 45, finished: "durable" } as const;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const footballDataConfig = {
  provider: process.env.FOOTBALL_DATA_PROVIDER?.trim() || "disabled",
  liveProviderEnabled: process.env.FOOTBALL_DATA_PROVIDER_ENABLED === "true",
  dailyRequestBudget: positiveInteger(process.env.FOOTBALL_API_DAILY_REQUEST_BUDGET, 6_500),
  dryRun: process.env.FOOTBALL_INGESTION_DRY_RUN !== "false",
  competitions: footballCompetitions,
} as const;

export function getConfiguredCompetition(id: string): FootballCompetitionConfig | undefined {
  return footballCompetitions.find((competition) => competition.id === id);
}
