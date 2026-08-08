import "@/lib/server-only";
import type { Json } from "@/lib/supabase/database.types";
import type { Competition, Fixture, TeamForm } from "@/modules/intelligence/domain";
import type { FootballDataProvider } from "@/modules/intelligence/providers";
import type { CompetitionIngestionPayload, FixtureRefreshPayload, NormalizedFixture, NormalizedSnapshot } from "./domain";
import { normalizeFixture, normalizeProviderId } from "./normalization";
import { FootballProviderUnavailableError } from "./providers";

type Transport = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type ApiObject = Record<string, unknown>;
interface ApiEnvelope { response?: unknown; errors?: unknown; paging?: unknown; }

export class MissingFootballProviderKeyError extends FootballProviderUnavailableError {
  constructor() { super("The football provider credential is not configured."); this.name = "MissingFootballProviderKeyError"; }
}
export class FootballProviderResponseError extends Error {
  requestCount: number;
  constructor(message: string, requestCount = 1) { super(message); this.name = "FootballProviderResponseError"; this.requestCount = requestCount; }
}
export class FootballProviderAuthenticationError extends FootballProviderResponseError { constructor() { super("Provider authentication failed."); this.name = "FootballProviderAuthenticationError"; } }
export class FootballProviderRateLimitError extends FootballProviderResponseError { constructor() { super("Provider rate limit rejected the request."); this.name = "FootballProviderRateLimitError"; } }
export class EmptyFootballProviderResponseError extends FootballProviderResponseError { constructor() { super("Provider returned no records for required foundational data."); this.name = "EmptyFootballProviderResponseError"; } }

export interface ApiFootballProviderOptions {
  apiKey: string | null;
  enabled: boolean;
  baseUrl?: string;
  timeoutMs?: number;
  transport?: Transport;
  now?: () => Date;
}

function object(value: unknown): ApiObject { return value && typeof value === "object" && !Array.isArray(value) ? value as ApiObject : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function numberOrNull(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function json(value: unknown): Json { return JSON.parse(JSON.stringify(value ?? null)) as Json; }

function normalizeApiFixture(value: unknown): NormalizedFixture {
  const row = object(value), fixture = object(row.fixture), league = object(row.league), teams = object(row.teams), goals = object(row.goals);
  return normalizeFixture({
    id: text(fixture.id), competitionId: text(league.id), homeTeamId: text(object(teams.home).id), awayTeamId: text(object(teams.away).id),
    kickoffAt: text(fixture.date), status: text(object(fixture.status).short), homeScore: numberOrNull(goals.home), awayScore: numberOrNull(goals.away),
  });
}

function normalizeCategory(category: NormalizedSnapshot["category"], rows: unknown[]): Json {
  if (category === "standings") return json(rows.flatMap((row) => array(object(object(row).league).standings)).map((group) => array(group).map((entry) => { const item = object(entry), team = object(item.team), all = object(item.all); return { rank: numberOrNull(item.rank), teamId: text(team.id), teamName: text(team.name), points: numberOrNull(item.points), goalDifference: numberOrNull(item.goalsDiff), played: numberOrNull(all.played), form: text(item.form) }; })));
  if (category === "injuries") return json(rows.map((row) => { const item = object(row), player = object(item.player), team = object(item.team); return { playerId: text(player.id), playerName: text(player.name), teamId: text(team.id), type: text(player.type), reason: text(player.reason) }; }));
  if (category === "lineups") return json(rows.map((row) => { const item = object(row), team = object(item.team); return { teamId: text(team.id), teamName: text(team.name), formation: text(item.formation), startXI: array(item.startXI).map((entry) => ({ playerId: text(object(object(entry).player).id), name: text(object(object(entry).player).name), position: text(object(object(entry).player).pos) })), substitutes: array(item.substitutes).map((entry) => ({ playerId: text(object(object(entry).player).id), name: text(object(object(entry).player).name), position: text(object(object(entry).player).pos) })) }; }));
  if (category === "statistics") return json(rows.map((row) => { const item = object(row), team = object(item.team); return { teamId: text(team.id), teamName: text(team.name), values: array(item.statistics).map((entry) => ({ name: text(object(entry).type), value: object(entry).value ?? null })) }; }));
  if (category === "odds") return json(rows.flatMap((row) => array(object(row).bookmakers)).map((bookmaker) => ({ bookmakerId: text(object(bookmaker).id), name: text(object(bookmaker).name), markets: array(object(bookmaker).bets).map((market) => ({ marketId: text(object(market).id), name: text(object(market).name), selections: array(object(market).values).map((selection) => ({ label: text(object(selection).value), odd: text(object(selection).odd) })) })) })));
  if (category === "h2h") return json(rows.map((row) => normalizeApiFixture(row)));
  if (category === "form") return json(rows.map((row) => normalizeApiFixture(row)));
  return json(rows);
}

export class ApiFootballProvider implements FootballDataProvider {
  readonly name = "api-football";
  readonly enabled: boolean;
  readonly credentialConfigured: boolean;
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly transport: Transport;
  private readonly now: () => Date;

  constructor(options: ApiFootballProviderOptions) {
    this.enabled = options.enabled;
    this.apiKey = options.apiKey;
    this.credentialConfigured = Boolean(options.apiKey);
    this.baseUrl = options.baseUrl ?? "https://v3.football.api-sports.io";
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.transport = options.transport ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  estimateCompetitionRequests(categories: readonly string[] = ["metadata", "teams", "fixtures"]): number { return new Set(categories).size; }
  estimateFixtureRequests(categories: readonly string[] = ["form", "h2h", "injuries", "lineups", "statistics", "odds"]): number { return 1 + new Set(categories).size + (categories.includes("form") ? 1 : 0); }
  async getFixtures(): Promise<Fixture[]> { return []; }
  async getFixture(): Promise<Fixture | null> { return null; }
  async getTeamForm(teamId: string): Promise<TeamForm> { return { teamId, sequence: [], summary: "Persisted form is not available yet." }; }
  async getCompetition(): Promise<Competition | null> { return null; }
  async getResult(): Promise<Fixture | null> { return null; }

  private async request(path: string, parameters: Record<string, string>, requireRows = false): Promise<unknown[]> {
    if (!this.enabled) throw new FootballProviderUnavailableError();
    if (!this.apiKey) throw new MissingFootballProviderKeyError();
    const url = new URL(path, `${this.baseUrl}/`); Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(url, { headers: { "x-apisports-key": this.apiKey }, signal: controller.signal });
      if (response.status === 401 || response.status === 403) throw new FootballProviderAuthenticationError();
      if (response.status === 429) throw new FootballProviderRateLimitError();
      if (!response.ok) throw new FootballProviderResponseError(`Provider returned HTTP ${response.status}.`);
      const body = await response.json() as ApiEnvelope, errors = Array.isArray(body.errors) ? body.errors : Object.values(object(body.errors));
      if (errors.length) {
        const joined = errors.map((item) => text(item)).join(" ").toLowerCase();
        if (/rate|limit|quota/.test(joined)) throw new FootballProviderRateLimitError();
        if (/auth|key|token|access/.test(joined)) throw new FootballProviderAuthenticationError();
        throw new FootballProviderResponseError("Provider returned an API-level error response.");
      }
      if (!Array.isArray(body.response)) throw new FootballProviderResponseError("Provider response array is missing or malformed.");
      if (body.paging !== undefined) { const paging = object(body.paging), current = numberOrNull(paging.current), total = numberOrNull(paging.total); if (current === null || total === null || current < 1 || total < 1 || current > total) throw new FootballProviderResponseError("Provider returned an unexpected pagination state."); }
      if (requireRows && body.response.length === 0) throw new EmptyFootballProviderResponseError();
      return body.response;
    } catch (error) {
      if (error instanceof FootballProviderResponseError) throw error;
      throw new FootballProviderResponseError(error instanceof Error && error.name === "AbortError" ? "Provider request timed out." : "Provider request failed.");
    } finally { clearTimeout(timeout); }
  }

  async fetchCompetitionData(providerCompetitionId: string, season: string, categories: readonly string[] = ["metadata", "teams", "fixtures"]): Promise<CompetitionIngestionPayload> {
    normalizeProviderId(providerCompetitionId); normalizeProviderId(season);
    let requestCount = 0;
    try {
      const categorySet = new Set(categories);
      const leagueRows = categorySet.has("metadata") ? (requestCount++, await this.request("leagues", { id: providerCompetitionId, season }, true)) : [];
      const teamRows = categorySet.has("teams") ? (requestCount++, await this.request("teams", { league: providerCompetitionId, season }, true)) : [];
      const fixtureRows = categorySet.has("fixtures") || categorySet.has("results") ? (requestCount++, await this.request("fixtures", { league: providerCompetitionId, season })) : [];
      const standingRows = categorySet.has("standings") ? (requestCount++, await this.request("standings", { league: providerCompetitionId, season })) : [];
      const leagueRow = object(leagueRows[0]), league = object(leagueRow.league), country = object(leagueRow.country), fetchedAt = this.now().toISOString();
      if (leagueRows.length) { const returnedLeagueId = text(object(object(leagueRows[0]).league).id); if (!returnedLeagueId || returnedLeagueId !== providerCompetitionId) throw new FootballProviderResponseError("Provider competition metadata did not match the requested competition."); }
      const fixtures = fixtureRows.map(normalizeApiFixture);
      const snapshots: NormalizedSnapshot[] = standingRows.length && fixtures[0] ? [{ fixtureProviderId: fixtures[0].providerId, category: "standings", payload: normalizeCategory("standings", standingRows), providerReference: `standings?league=${providerCompetitionId}&season=${season}`, fetchedAt }] : [];
      return {
        competition: { providerId: providerCompetitionId, name: text(league.name) || `Competition ${providerCompetitionId}`, country: text(country.name) || null, season, enabled: true, priority: 100 },
        teams: teamRows.map((row) => { const item = object(row), team = object(item.team), providerId = normalizeProviderId(text(team.id)), name = text(team.name).trim(); if (!name) throw new FootballProviderResponseError("Provider returned an incomplete team record."); return { providerId, competitionProviderId: providerCompetitionId, name, shortName: text(team.code) || null, logoUrl: text(team.logo) || null, country: text(team.country) || null }; }),
        fixtures, snapshots, fetchedAt, requestCount,
      };
    } catch (error) { if (error instanceof FootballProviderResponseError) error.requestCount = Math.max(1, requestCount); throw error; }
  }

  async fetchFixtureData(providerFixtureId: string, categories: readonly string[] = ["form", "h2h", "injuries", "lineups", "statistics", "odds"]): Promise<FixtureRefreshPayload> {
    normalizeProviderId(providerFixtureId);
    let requestCount = 0;
    try {
      const fixtureRows = (requestCount++, await this.request("fixtures", { id: providerFixtureId }, true));
      if (!fixtureRows[0]) throw new FootballProviderResponseError("Provider fixture was not found.", requestCount);
      const fixture = normalizeApiFixture(fixtureRows[0]), row = object(fixtureRows[0]), teams = object(row.teams), home = text(object(teams.home).id), away = text(object(teams.away).id), fetchedAt = this.now().toISOString();
      const requests: [NormalizedSnapshot["category"], string, Record<string, string>][] = [
        ["h2h", "fixtures/headtohead", { h2h: `${home}-${away}`, last: "10" }], ["injuries", "injuries", { fixture: providerFixtureId }], ["lineups", "fixtures/lineups", { fixture: providerFixtureId }], ["statistics", "fixtures/statistics", { fixture: providerFixtureId }], ["odds", "odds", { fixture: providerFixtureId }],
      ];
      const requested = new Set(categories), snapshots: NormalizedSnapshot[] = [];
      if (requested.has("form")) {
        requestCount++; const homeForm = await this.request("fixtures", { team: home, last: "5" });
        requestCount++; const awayForm = await this.request("fixtures", { team: away, last: "5" });
        snapshots.push({ fixtureProviderId: providerFixtureId, category: "form", payload: json({ homeTeamProviderId: home, awayTeamProviderId: away, home: normalizeCategory("form", homeForm), away: normalizeCategory("form", awayForm) }), providerReference: `fixtures?teams=${home},${away}&last=5`, fetchedAt });
      }
      for (const [category, endpoint, parameters] of requests) { if (!requested.has(category)) continue; requestCount++; const rows = await this.request(endpoint, parameters); snapshots.push({ fixtureProviderId: providerFixtureId, category, payload: normalizeCategory(category, rows), providerReference: `${endpoint}?fixture=${providerFixtureId}`, fetchedAt }); }
      return { fixture, snapshots, fetchedAt, requestCount };
    } catch (error) { if (error instanceof FootballProviderResponseError) error.requestCount = Math.max(1, requestCount); throw error; }
  }
}
