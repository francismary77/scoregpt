import "@/lib/server-only";
import { footballCompetitions } from "@/config/football-data";
import type { ShadowPipelineControls, SupportedShadowCompetition } from "./domain";
import { resolvePredictionHorizonHours } from "@/modules/football-intelligence/prediction-horizon";

const positive = (value: string | undefined, fallback: number, maximum: number) => { const parsed = Number.parseInt(value ?? "", 10); return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback; };
export function getShadowPipelineControls(env:NodeJS.ProcessEnv=process.env): ShadowPipelineControls { return { enabled: env.SHADOW_PREDICTION_PIPELINE_ENABLED === "true", providerCallsEnabled: env.SHADOW_PROVIDER_CALLS_ENABLED === "true", publicPublishingEnabled: env.PUBLIC_PREDICTION_PUBLISHING_ENABLED === "true", globallyPaused: false, horizonHours: resolvePredictionHorizonHours(env), maxProviderRequestsPerRun: positive(env.SHADOW_MAX_PROVIDER_REQUESTS_PER_RUN, 50, 200), maxFixtureRefreshAgeMinutes: positive(env.SHADOW_MAX_FIXTURE_REFRESH_AGE_MINUTES, 180, 1440) }; }
export function getSupportedShadowCompetitions(): SupportedShadowCompetition[] { return footballCompetitions.filter((item) => item.enabled && item.providerVerified && item.providerId && item.currentSeason).map((item) => ({ internalCompetitionId: item.id, providerCompetitionId: item.providerId!, name: item.name, providerName: item.providerName, country: item.country, season: item.currentSeason!, enabled: true })); }
