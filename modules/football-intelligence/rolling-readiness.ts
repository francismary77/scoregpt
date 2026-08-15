import "@/lib/server-only";
import type { NormalizedFixture, NormalizedTeam } from "@/modules/football-data/domain";
import type { ShadowFixtureSource, ShadowPipelineControls, ShadowPipelineRepositories, SupportedShadowCompetition } from "./shadow-pipeline";
import { runShadowPredictionPipeline } from "./shadow-pipeline";

export type FixtureWindowState = "INSIDE_168H" | "OUTSIDE_168H" | "ALREADY_STARTED_OR_INVALID" | "UNSAFE_STATUS";
export type EvidenceProvenance = "CURRENT_SEASON" | "SAME_LEAGUE_PRIOR_SEASON" | "PROMOTED_FROM_LOWER_DIVISION" | "CROSS_COMPETITION_HISTORY";
export type SeasonPhase = "OPENING" | "EARLY" | "ESTABLISHED";
export type UpcomingLeagueState = "COMING_SOON" | "PREDICTIONS_GENERATING" | "ACTIVE";

export interface OpeningFixtureAudit extends NormalizedFixture {
  windowState: FixtureWindowState;
  hoursUntilKickoff: number;
  eligibilityEntryAt: string;
  promotedClubInvolved: boolean;
  evidenceProvenance: EvidenceProvenance;
  evidenceAvailable: boolean;
  eligibilityReason: string;
}

export interface UpcomingMajorLeague {
  providerCompetitionId: string;
  name: string;
  country: string;
  season: string;
  firstFixtureAt: string | null;
  status: UpcomingLeagueState;
  predictionReadiness: boolean;
  fixturesInsidePredictionWindow: number;
  upcomingFixtureCount: number;
}

const safeStatuses = new Set(["scheduled", "not_started", "timed", "fixture"]);
export function classifyFixtureWindow(fixture: NormalizedFixture, now: string, horizonHours = 168): FixtureWindowState {
  const delta = new Date(fixture.kickoffAt).getTime() - new Date(now).getTime();
  if (!Number.isFinite(delta) || delta <= 0) return "ALREADY_STARTED_OR_INVALID";
  if (!safeStatuses.has(fixture.status)) return "UNSAFE_STATUS";
  return delta <= horizonHours * 3_600_000 ? "INSIDE_168H" : "OUTSIDE_168H";
}
export const seasonPhase = (completedCurrentSeason: number): SeasonPhase => completedCurrentSeason === 0 ? "OPENING" : completedCurrentSeason < 5 ? "EARLY" : "ESTABLISHED";

export function auditOpeningFixtures(options: { fixtures: readonly NormalizedFixture[]; currentTeams: readonly NormalizedTeam[]; priorTopFlightTeamIds: ReadonlySet<string>; priorEvidenceCounts: ReadonlyMap<string, number>; now: string }): OpeningFixtureAudit[] {
  const currentIds = new Set(options.currentTeams.map((team) => team.providerId));
  return options.fixtures.map((fixture) => {
    const state = classifyFixtureWindow(fixture, options.now), promoted = !options.priorTopFlightTeamIds.has(fixture.homeTeamProviderId) || !options.priorTopFlightTeamIds.has(fixture.awayTeamProviderId), homeEvidence = options.priorEvidenceCounts.get(fixture.homeTeamProviderId) ?? 0, awayEvidence = options.priorEvidenceCounts.get(fixture.awayTeamProviderId) ?? 0, comparable = homeEvidence >= 5 && awayEvidence >= 5 && !promoted, identityValid = Boolean(fixture.providerId && currentIds.has(fixture.homeTeamProviderId) && currentIds.has(fixture.awayTeamProviderId) && fixture.homeTeamProviderId !== fixture.awayTeamProviderId);
    const evidenceProvenance: EvidenceProvenance = promoted ? "PROMOTED_FROM_LOWER_DIVISION" : "SAME_LEAGUE_PRIOR_SEASON";
    const reason = !identityValid ? "INVALID_FIXTURE_IDENTITY" : state !== "INSIDE_168H" ? state : !comparable ? "INSUFFICIENT_COMPARABLE_HISTORY" : "ELIGIBLE";
    return { ...fixture, windowState: state, hoursUntilKickoff: (new Date(fixture.kickoffAt).getTime() - new Date(options.now).getTime()) / 3_600_000, eligibilityEntryAt: new Date(new Date(fixture.kickoffAt).getTime() - 168 * 3_600_000).toISOString(), promotedClubInvolved: promoted, evidenceProvenance, evidenceAvailable: comparable, eligibilityReason: reason };
  });
}

export function toUpcomingMajorLeague(input: { providerCompetitionId: string; name: string; country: string; season: string; fixtures: readonly OpeningFixtureAudit[] }): UpcomingMajorLeague {
  const future = input.fixtures.filter((fixture) => fixture.windowState === "INSIDE_168H" || fixture.windowState === "OUTSIDE_168H"), inside = future.filter((fixture) => fixture.windowState === "INSIDE_168H"), ready = inside.some((fixture) => fixture.eligibilityReason === "ELIGIBLE");
  return { providerCompetitionId: input.providerCompetitionId, name: input.name, country: input.country, season: input.season, firstFixtureAt: future.map((fixture) => fixture.kickoffAt).sort()[0] ?? null, status: ready ? "PREDICTIONS_GENERATING" : inside.length ? "COMING_SOON" : "COMING_SOON", predictionReadiness: ready, fixturesInsidePredictionWindow: inside.length, upcomingFixtureCount: future.length };
}

const activeLocks = new Set<string>();
export async function runRollingShadowWorker(options: { lockKey: string; sources: readonly ShadowFixtureSource[]; repositories: ShadowPipelineRepositories; controls: ShadowPipelineControls; allowlist: readonly SupportedShadowCompetition[]; frozenProviderFixtureIds: ReadonlySet<string>; now: string; persist?: boolean }) {
  if (activeLocks.has(options.lockKey)) return { status: "OVERLAPPING_RUN_SKIPPED" as const, report: null };
  activeLocks.add(options.lockKey);
  try {
    const sources = options.sources.map((source) => ({ ...source, upcomingFixtures: source.upcomingFixtures.filter((fixture) => !options.frozenProviderFixtureIds.has(fixture.providerFixtureId)) }));
    const report = await runShadowPredictionPipeline(sources, options.repositories, options.controls, options.allowlist, { now: options.now, dryRun: options.persist !== true, persist: options.persist === true, horizonHours: options.controls.horizonHours, minimumLeadMinutes: 120 });
    return { status: "COMPLETED" as const, report };
  } finally { activeLocks.delete(options.lockKey); }
}
