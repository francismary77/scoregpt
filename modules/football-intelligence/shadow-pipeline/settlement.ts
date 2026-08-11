import { createHash } from "node:crypto";
import type { SelectedOutcome } from "../selective-publishing";
import type { SettlementStatus, ShadowPredictionRecord, ShadowPredictionRepository } from "./domain";

export interface VerifiedFixtureResult {
  providerFixtureId: string;
  providerCompetitionId: string;
  season: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

export type SettlementDisposition = "UPDATED" | "ALREADY_SETTLED_IDENTICAL";

const immutablePayload = (row: ShadowPredictionRecord) => ({
  fixtureId: row.fixtureId,
  providerFixtureId: row.providerFixtureId,
  competitionId: row.competitionId,
  providerCompetitionId: row.providerCompetitionId,
  season: row.season,
  homeTeamId: row.homeTeamId,
  awayTeamId: row.awayTeamId,
  kickoffAt: new Date(row.kickoffAt).toISOString(),
  predictionCreatedAt: new Date(row.predictionCreatedAt).toISOString(),
  evidenceCutoffAt: new Date(row.evidenceCutoffAt).toISOString(),
  methodologyKey: row.methodologyKey,
  methodologyVersion: row.methodologyVersion,
  confidenceVersion: row.confidenceVersion,
  publishingPolicyVersion: row.publishingPolicyVersion,
  selectedOutcome: row.selectedOutcome,
  probabilities: [row.homeProbability, row.drawProbability, row.awayProbability],
  confidenceScoreInternal: row.confidenceScoreInternal,
  confidenceLabel: row.confidenceLabel,
  publishingTierCalculated: row.publishingTierCalculated,
  rankingScope: row.rankingScope,
  rankingDate: row.rankingDate,
  rankingPosition: row.rankingPosition,
  eligiblePopulationSize: row.eligiblePopulationSize,
  isTopPickCalculated: row.isTopPickCalculated,
  operationalPublicationState: row.operationalPublicationState,
  shadowMode: row.shadowMode,
  methodologySnapshot: row.methodologySnapshot,
});

export const immutablePredictionFingerprint = (row: ShadowPredictionRecord) =>
  createHash("sha256").update(JSON.stringify(immutablePayload(row))).digest("hex");

const finalStatuses = new Set(["finished", "ft", "match_finished", "aet", "pen"]);
const outcome = (home: number, away: number): SelectedOutcome => home > away ? "home" : home < away ? "away" : "draw";

function statusFor(value: string): SettlementStatus {
  const status = value.trim().toLowerCase();
  if (finalStatuses.has(status)) return "SETTLED";
  if (status === "postponed" || status === "pst") return "POSTPONED";
  if (status === "cancelled" || status === "canc") return "CANCELLED";
  if (status === "abandoned" || status === "abd") return "ABANDONED";
  if (status === "void") return "VOID";
  return "PENDING";
}

function validateIdentity(prediction: ShadowPredictionRecord, fixture: VerifiedFixtureResult) {
  if (fixture.providerFixtureId !== prediction.providerFixtureId) throw new Error("MISMATCHED_FIXTURE_ID");
  if (fixture.providerCompetitionId !== prediction.providerCompetitionId) throw new Error("MISMATCHED_COMPETITION");
  if (fixture.season !== prediction.season) throw new Error("MISMATCHED_SEASON");
  if (fixture.homeTeamId !== prediction.homeTeamId || fixture.awayTeamId !== prediction.awayTeamId) throw new Error("MISMATCHED_TEAMS");
  if (new Date(fixture.kickoffAt).getTime() !== new Date(prediction.kickoffAt).getTime()) throw new Error("MISMATCHED_KICKOFF");
  if (new Date(prediction.predictionCreatedAt) >= new Date(prediction.kickoffAt)) throw new Error("INVALID_PREDICTION_TIMING");
  if (new Date(prediction.evidenceCutoffAt) >= new Date(prediction.predictionCreatedAt)) throw new Error("INVALID_EVIDENCE_CUTOFF");
  const total = prediction.homeProbability + prediction.drawProbability + prediction.awayProbability;
  if (![prediction.homeProbability, prediction.drawProbability, prediction.awayProbability].every((value) => value >= 0 && value <= 1) || Math.abs(total - 1) > .001) throw new Error("INVALID_PROBABILITIES");
}

export async function settleShadowPrediction(
  repository: ShadowPredictionRepository,
  prediction: ShadowPredictionRecord,
  fixture: VerifiedFixtureResult,
  checkedAt: string,
): Promise<{ record: ShadowPredictionRecord; disposition: SettlementDisposition }> {
  validateIdentity(prediction, fixture);
  const before = immutablePredictionFingerprint(prediction);
  const status = statusFor(fixture.status);
  if (status === "PENDING") throw new Error("FIXTURE_NOT_FINAL");
  if (status === "SETTLED" && (fixture.homeScore === null || fixture.awayScore === null)) throw new Error("FINAL_SCORE_MISSING");
  const actual = status === "SETTLED" ? outcome(fixture.homeScore!, fixture.awayScore!) : null;
  if (prediction.settlementStatus === "SETTLED") {
    if (prediction.actualHomeGoals === fixture.homeScore && prediction.actualAwayGoals === fixture.awayScore && prediction.actualOutcome === actual) return { record: prediction, disposition: "ALREADY_SETTLED_IDENTICAL" };
    throw new Error("SETTLED_RESULT_CONFLICT");
  }
  const updated = await repository.updateSettlement(prediction.id, prediction.updatedAt, {
    settlementStatus: status,
    actualHomeGoals: actual === null ? null : fixture.homeScore,
    actualAwayGoals: actual === null ? null : fixture.awayScore,
    actualOutcome: actual,
    predictionCorrect: actual === null ? null : prediction.selectedOutcome === actual,
    settledAt: status === "SETTLED" ? checkedAt : null,
  });
  if (before !== immutablePredictionFingerprint(updated)) throw new Error("CRITICAL_IMMUTABILITY_FAILURE");
  if (updated.operationalPublicationState !== prediction.operationalPublicationState || !updated.shadowMode) throw new Error("CRITICAL_PUBLICATION_STATE_FAILURE");
  return { record: updated, disposition: "UPDATED" };
}
