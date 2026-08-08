import type { FootballDataProvider } from "@/modules/intelligence/providers";

export class FootballProviderUnavailableError extends Error {
  constructor(message = "Live football data is not enabled.") {
    super(message);
    this.name = "FootballProviderUnavailableError";
  }
}

export class DisabledFootballDataProvider implements FootballDataProvider {
  readonly name = "disabled";
  readonly enabled = false;
  private unavailable(): never { throw new FootballProviderUnavailableError(); }
  async getFixtures() { return []; }
  async getFixture() { return null; }
  async getTeamForm(teamId: string) { return { teamId, sequence: [], summary: "Live form is unavailable." }; }
  async getCompetition() { return null; }
  async getResult() { return null; }
  async fetchCompetitionData(): Promise<never> { return this.unavailable(); }
  async fetchFixtureData(): Promise<never> { return this.unavailable(); }
}
