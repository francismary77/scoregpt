import "@/lib/server-only";
export interface ServerFootballProviderConfig {
  provider: "disabled" | "api-football";
  enabled: boolean;
  apiKey: string | null;
  dailyRequestBudget: number;
  dryRun: boolean;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getServerFootballProviderConfig(env: NodeJS.ProcessEnv = process.env): ServerFootballProviderConfig {
  const provider = env.FOOTBALL_DATA_PROVIDER?.trim() === "api-football" ? "api-football" : "disabled";
  return {
    provider,
    enabled: provider === "api-football" && env.FOOTBALL_DATA_PROVIDER_ENABLED === "true",
    apiKey: env.FOOTBALL_API_KEY?.trim() || null,
    dailyRequestBudget: positiveInteger(env.FOOTBALL_API_DAILY_REQUEST_BUDGET, 30),
    dryRun: env.FOOTBALL_INGESTION_DRY_RUN !== "false",
  };
}
