import type { Competition, Fixture, IntelligenceReport, MatchStatistics, TeamForm } from "./domain";
export interface FootballDataProvider { getFixtures(date?: string): Promise<Fixture[]>; getFixture(id: string): Promise<Fixture | null>; getTeamForm(teamId: string): Promise<TeamForm>; getCompetition(id: string): Promise<Competition | null>; getResult(fixtureId: string): Promise<Fixture | null> }
export interface AIIntelligenceInput { fixture: Fixture; competition: Competition; homeForm: TeamForm; awayForm: TeamForm; statistics: MatchStatistics }
export interface AIIntelligenceProvider { generateMatchIntelligence(input: AIIntelligenceInput): Promise<IntelligenceReport> }
