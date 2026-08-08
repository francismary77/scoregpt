import type { MatchStatus } from "@/modules/intelligence/domain";
import type { NormalizedFixture } from "./domain";

export interface ProviderFixtureRecord {
  id: string | number;
  competitionId: string | number;
  homeTeamId: string | number;
  awayTeamId: string | number;
  kickoffAt: string;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

export function normalizeProviderId(value: string | number): string {
  const id = String(value).trim();
  if (!id) throw new Error("Provider ID cannot be empty.");
  return id;
}

export function normalizeMatchStatus(value: string): MatchStatus {
  const status = value.trim().toLowerCase();
  if (["live", "1h", "2h", "ht", "et", "p"].includes(status)) return "live";
  if (["finished", "ft", "aet", "pen"].includes(status)) return "finished";
  if (["postponed", "pst"].includes(status)) return "postponed";
  if (["cancelled", "canc", "abd", "awd", "wo"].includes(status)) return "cancelled";
  return "scheduled";
}

export function normalizeFixture(record: ProviderFixtureRecord): NormalizedFixture {
  const kickoff = new Date(record.kickoffAt);
  if (Number.isNaN(kickoff.getTime())) throw new Error("Fixture kickoff must be a valid timestamp.");
  return {
    providerId: normalizeProviderId(record.id),
    competitionProviderId: normalizeProviderId(record.competitionId),
    homeTeamProviderId: normalizeProviderId(record.homeTeamId),
    awayTeamProviderId: normalizeProviderId(record.awayTeamId),
    kickoffAt: kickoff.toISOString(),
    status: normalizeMatchStatus(record.status),
    homeScore: record.homeScore ?? null,
    awayScore: record.awayScore ?? null,
  };
}
