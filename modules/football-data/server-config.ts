import "@/lib/server-only";
import { footballDataConfig } from "@/config/football-data";

export interface ServerFootballProviderConfig {
  provider: "disabled" | "api-football";
  enabled: boolean;
  apiKey: string | null;
  dailyRequestBudget: number;
  dryRun: boolean;
}

export function getServerFootballProviderConfig(): ServerFootballProviderConfig {
  const provider = footballDataConfig.provider === "api-football" ? "api-football" : "disabled";
  return {
    provider,
    enabled: provider === "api-football" && footballDataConfig.liveProviderEnabled,
    apiKey: process.env.FOOTBALL_API_KEY?.trim() || null,
    dailyRequestBudget: footballDataConfig.dailyRequestBudget,
    dryRun: footballDataConfig.dryRun,
  };
}
