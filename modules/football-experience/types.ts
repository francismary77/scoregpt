import type { ContentAccessLevel } from "@/modules/account/domain";
import type { Json } from "@/lib/supabase/database.types";

export type DataProvenance = "persisted" | "demonstration";
export interface TeamSummary { id: string; name: string; shortName: string | null; logoUrl: string | null; country: string | null; provenance: DataProvenance }
export interface CompetitionSummary { id: string; name: string; country: string; logoUrl: string | null; season: string | null; enabled: boolean; featured: boolean; availability: "available" | "rolling-out" | "planned"; fixtureCount?: number; provenance: DataProvenance }
export interface FixtureSummary { id: string; competition: CompetitionSummary; kickoffAt: string; displayKickoff: string; status: string; homeTeam: TeamSummary; awayTeam: TeamSummary; homeScore: number | null; awayScore: number | null; venue: string | null; provenance: DataProvenance }
export interface ResultSummary { fixture: FixtureSummary; date: string; status: string; provenance: DataProvenance }
export interface IntelligenceReportSummary { id: string; fixture: FixtureSummary; headline: string; excerpt: string | null; confidence: number | null; riskLevel: string | null; recommendedMarket: string | null; accessLevel: ContentAccessLevel; published: boolean; forwardPrediction: boolean; provenance: DataProvenance }
export interface PredictionMarketSummary { id: string; market: string; prediction: string; confidence: number; riskLevel: string; reasoning: string }
export interface RichDataSection { category: string; available: boolean; payload: Json | null; provenance: DataProvenance | null }
export interface FixtureDetail { fixture: FixtureSummary; report: IntelligenceReportSummary | null; markets: PredictionMarketSummary[]; sections: RichDataSection[] }
export interface FootballExperienceData { competitions: CompetitionSummary[]; fixtures: FixtureSummary[]; results: ResultSummary[]; reports: IntelligenceReportSummary[]; source: DataProvenance; degraded: boolean }
