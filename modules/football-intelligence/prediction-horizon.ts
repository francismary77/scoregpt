import "@/lib/server-only";

export const DEFAULT_PREDICTION_HORIZON_HOURS = 168;
export const MAX_EVALUATION_HORIZON_HOURS = 216;

export function resolvePredictionHorizonHours(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PREDICTION_EVALUATION_HORIZON_HOURS?.trim();
  if (!raw) return DEFAULT_PREDICTION_HORIZON_HOURS;
  const parsed = Number.parseInt(raw, 10);
  if (String(parsed) !== raw || (parsed !== DEFAULT_PREDICTION_HORIZON_HOURS && parsed !== MAX_EVALUATION_HORIZON_HOURS)) {
    throw new Error("Invalid server prediction evaluation horizon.");
  }
  return parsed;
}

