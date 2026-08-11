import "@/lib/server-only";
import { footballCompetitions } from "@/config/football-data";
import type { ShadowPipelineControls, SupportedShadowCompetition } from "./domain";

const positive = (value: string | undefined, fallback: number, maximum: number) => { const parsed = Number.parseInt(value ?? "", 10); return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback; };
export function getShadowPipelineControls(): ShadowPipelineControls { return { enabled: process.env.SHADOW_PREDICTION_PIPELINE_ENABLED === "true", providerCallsEnabled: process.env.SHADOW_PROVIDER_CALLS_ENABLED === "true", publicPublishingEnabled: false, globallyPaused: false, horizonHours: positive(process.env.SHADOW_PREDICTION_HORIZON_HOURS, 72, 168), maxProviderRequestsPerRun: positive(process.env.SHADOW_MAX_PROVIDER_REQUESTS_PER_RUN, 1, 10), maxFixtureRefreshAgeMinutes: positive(process.env.SHADOW_MAX_FIXTURE_REFRESH_AGE_MINUTES, 180, 1440) }; }
export function getSupportedShadowCompetitions(): SupportedShadowCompetition[] { return footballCompetitions.filter((item) => item.enabled && item.providerId && item.currentSeason).map((item) => ({ internalCompetitionId: item.id, providerCompetitionId: item.providerId!, name: item.name, providerName: item.providerName, country: item.country, season: item.currentSeason!, enabled: true })); }
