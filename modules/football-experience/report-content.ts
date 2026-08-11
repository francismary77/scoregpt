import type { Json } from "@/lib/supabase/database.types";

export interface FrozenForwardReportContent {
  selectedOutcome: "home" | "draw" | "away";
  probabilities: { home: number; draw: number; away: number };
  confidenceLabel: "LOW" | "MODERATE" | "STRONG";
  publicationTier: "TOP_PICK" | "STANDARD_ANALYSIS" | "LIMITED_EVIDENCE";
  methodologyVersion: string;
  evidenceCutoffAt: string;
}

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const finiteProbability = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

export function parseFrozenForwardReportContent(value: Json | null): FrozenForwardReportContent | null {
  const root = record(value), probabilities = record(root?.probabilities), confidence = record(root?.confidence), publication = record(root?.publication), methodology = record(root?.methodology), evidence = record(root?.evidence);
  if (root?.kind !== "frozen-forward-prediction-v1") return null;
  const selectedOutcome = root.selectedOutcome, confidenceLabel = confidence?.label, publicationTier = publication?.tier;
  if (!["home", "draw", "away"].includes(String(selectedOutcome))) return null;
  if (!["LOW", "MODERATE", "STRONG"].includes(String(confidenceLabel))) return null;
  if (!["TOP_PICK", "STANDARD_ANALYSIS", "LIMITED_EVIDENCE"].includes(String(publicationTier))) return null;
  if (!finiteProbability(probabilities?.home) || !finiteProbability(probabilities?.draw) || !finiteProbability(probabilities?.away)) return null;
  if (Math.abs(probabilities.home + probabilities.draw + probabilities.away - 1) > .001) return null;
  if (typeof methodology?.version !== "string" || typeof evidence?.cutoffAt !== "string" || !Number.isFinite(new Date(evidence.cutoffAt).getTime())) return null;
  return { selectedOutcome: selectedOutcome as FrozenForwardReportContent["selectedOutcome"], probabilities: { home: probabilities.home, draw: probabilities.draw, away: probabilities.away }, confidenceLabel: confidenceLabel as FrozenForwardReportContent["confidenceLabel"], publicationTier: publicationTier as FrozenForwardReportContent["publicationTier"], methodologyVersion: methodology.version, evidenceCutoffAt: evidence.cutoffAt };
}
