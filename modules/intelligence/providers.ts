import type { Competition, Fixture, IntelligenceReport, MatchStatistics, TeamForm } from "./domain";
import type { CompetitionIngestionPayload, FixtureRefreshPayload } from "@/modules/football-data/domain";
export interface FootballDataProvider {
  readonly name: string;
  readonly enabled: boolean;
  getFixtures(date?: string): Promise<Fixture[]>;
  getFixture(id: string): Promise<Fixture | null>;
  getTeamForm(teamId: string): Promise<TeamForm>;
  getCompetition(id: string): Promise<Competition | null>;
  getResult(fixtureId: string): Promise<Fixture | null>;
  fetchCompetitionData(providerCompetitionId: string, season: string): Promise<CompetitionIngestionPayload>;
  fetchFixtureData(providerFixtureId: string): Promise<FixtureRefreshPayload>;
}
export interface AIIntelligenceInput { fixture: Fixture; competition: Competition; homeForm: TeamForm; awayForm: TeamForm; statistics: MatchStatistics }
export interface AIIntelligenceProvider { generateMatchIntelligence(input: AIIntelligenceInput): Promise<IntelligenceReport> }
