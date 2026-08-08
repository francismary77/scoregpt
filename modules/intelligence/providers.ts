import type { Competition, Fixture, IntelligenceReport, MatchStatistics, TeamForm } from "./domain";
import type { CompetitionIngestionPayload, FixtureRefreshPayload } from "@/modules/football-data/domain";
export interface FootballDataProvider {
  readonly name: string;
  readonly enabled: boolean;
  readonly credentialConfigured?: boolean;
  getFixtures(date?: string): Promise<Fixture[]>;
  getFixture(id: string): Promise<Fixture | null>;
  getTeamForm(teamId: string): Promise<TeamForm>;
  getCompetition(id: string): Promise<Competition | null>;
  getResult(fixtureId: string): Promise<Fixture | null>;
  estimateCompetitionRequests?(categories?: readonly string[]): number;
  estimateFixtureRequests?(categories?: readonly string[]): number;
  fetchCompetitionData(providerCompetitionId: string, season: string, categories?: readonly string[]): Promise<CompetitionIngestionPayload>;
  fetchFixtureData(providerFixtureId: string, categories?: readonly string[]): Promise<FixtureRefreshPayload>;
}
export interface AIIntelligenceInput { fixture: Fixture; competition: Competition; homeForm: TeamForm; awayForm: TeamForm; statistics: MatchStatistics }
export interface AIIntelligenceProvider { generateMatchIntelligence(input: AIIntelligenceInput): Promise<IntelligenceReport> }
