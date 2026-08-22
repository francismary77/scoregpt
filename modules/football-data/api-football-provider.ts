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
export interface ApiFootballCompetitionCandidate { providerId: string; name: string; country: string; type: string | null; seasons: Array<{ year: string; start: string; end: string; current: boolean; coverage?: { standings: boolean; statistics: boolean; injuries: boolean; predictions: boolean; odds: boolean } }> }
export interface ApiFootballFixtureWindow { competition: ApiFootballCompetitionCandidate; season: string; from: string; to: string; teams: CompetitionIngestionPayload["teams"]; fixtures: NormalizedFixture[]; fetchedAt: string; requestCount: 2 }
export interface ApiFootballRequestAudit { path: string; parameters: Readonly<Record<string, string>>; httpStatus: number | null; recordsReturned: number | null; rateLimitRemaining: number | null }

export class MissingFootballProviderKeyError extends FootballProviderUnavailableError {
  constructor() { super("The football provider credential is not configured."); this.name = "MissingFootballProviderKeyError"; }
}
export class FootballProviderResponseError extends Error {
  requestCount: number;
  httpStatus: number | null;
  providerCategory: "authentication" | "quota" | "subscription" | "invalid-request" | "invalid-season" | "provider-api" | "malformed-response";
  providerCode: string;
  safeDiagnostic: string;
  providerIdentity: FixtureRefreshPayload["providerIdentity"] | null = null;
  constructor(message: string, requestCount = 1, httpStatus: number | null = null, providerCategory: FootballProviderResponseError["providerCategory"] = "provider-api", providerCode = "provider_api_error", safeDiagnostic = message) { super(message); this.name = "FootballProviderResponseError"; this.requestCount = requestCount; this.httpStatus = httpStatus; this.providerCategory = providerCategory; this.providerCode = providerCode; this.safeDiagnostic = safeDiagnostic; }
}
export class FootballProviderAuthenticationError extends FootballProviderResponseError { constructor(httpStatus: number | null = null, diagnostic = "Provider rejected the configured credential.") { super("Provider authentication failed.", 1, httpStatus, "authentication", "authentication_failed", diagnostic); this.name = "FootballProviderAuthenticationError"; } }
export class FootballProviderRateLimitError extends FootballProviderResponseError { constructor(httpStatus: number | null = null, diagnostic = "Provider quota or rate limit rejected the request.") { super("Provider rate limit rejected the request.", 1, httpStatus, "quota", "quota_exceeded", diagnostic); this.name = "FootballProviderRateLimitError"; } }
export class FootballProviderAccessError extends FootballProviderResponseError { constructor(httpStatus: number | null = null, diagnostic = "The provider plan does not allow this data request.") { super("Provider subscription or access restriction.", 1, httpStatus, "subscription", "subscription_access_restricted", diagnostic); this.name = "FootballProviderAccessError"; } }
export class FootballProviderInvalidRequestError extends FootballProviderResponseError { constructor(httpStatus: number | null = null, diagnostic = "Provider rejected one or more request parameters.") { super("Provider rejected the request parameters.", 1, httpStatus, "invalid-request", "invalid_request", diagnostic); this.name = "FootballProviderInvalidRequestError"; } }
export class FootballProviderSeasonError extends FootballProviderResponseError { constructor(httpStatus: number | null = null, diagnostic = "The requested season is invalid or unavailable.") { super("Provider season is invalid or unavailable.", 1, httpStatus, "invalid-season", "invalid_or_unavailable_season", diagnostic); this.name = "FootballProviderSeasonError"; } }
export class MalformedFootballProviderResponseError extends FootballProviderResponseError { constructor(httpStatus: number | null = null, diagnostic = "Provider returned an unexpected response structure.") { super("Provider returned a malformed response.", 1, httpStatus, "malformed-response", "malformed_response", diagnostic); this.name = "MalformedFootballProviderResponseError"; } }
export class FootballProviderNormalizationError extends FootballProviderResponseError { constructor() { super("Provider response normalization failed.", 1, null, "malformed-response", "normalization_rejected", "Provider returned data that could not be normalized safely."); this.name = "FootballProviderNormalizationError"; } }
export class EmptyFootballProviderResponseError extends FootballProviderResponseError { constructor() { super("Provider returned no records for required foundational data."); this.name = "EmptyFootballProviderResponseError"; } }

export interface ApiFootballProviderOptions {
  apiKey: string | null;
  enabled: boolean;
  baseUrl?: string;
  timeoutMs?: number;
  transport?: Transport;
  now?: () => Date;
  onRequest?: (audit: ApiFootballRequestAudit) => void;
}

function object(value: unknown): ApiObject { return value && typeof value === "object" && !Array.isArray(value) ? value as ApiObject : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function numberOrNull(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function json(value: unknown): Json { return JSON.parse(JSON.stringify(value ?? null)) as Json; }
function normalizeSeason(value: unknown): ApiFootballCompetitionCandidate["seasons"][number] { const season = object(value), coverage = object(season.coverage), fixtures = object(coverage.fixtures); return { year: text(season.year), start: text(season.start), end: text(season.end), current: season.current === true, coverage: { standings: coverage.standings === true, statistics: coverage.players === true || coverage.top_scorers === true, injuries: coverage.injuries === true, predictions: coverage.predictions === true, odds: coverage.odds === true || fixtures.statistics_fixtures === true } }; }
type SafeProviderError = { key: string; message: string };
function sanitizeDiagnostic(value: unknown, secret: string | null): string {
  let result = text(value).replace(/[\r\n\t]+/g, " ").trim();
  if (secret) result = result.replaceAll(secret, "[redacted]");
  result = result.replace(/(x-apisports-key|api[_ -]?key|token|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]").replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]");
  return result.slice(0, 240) || "Provider returned an unspecified API error.";
}
function providerErrors(value: unknown, secret: string | null): SafeProviderError[] {
  if (Array.isArray(value)) return value.map((item, index) => ({ key: `error_${index + 1}`, message: sanitizeDiagnostic(typeof item === "object" ? JSON.stringify(item) : item, secret) }));
  return Object.entries(object(value)).map(([key, message]) => ({ key: key.toLowerCase(), message: sanitizeDiagnostic(message, secret) }));
}
function classifyProviderErrors(errors: SafeProviderError[], httpStatus: number): FootballProviderResponseError {
  const keys = errors.map((item) => item.key).join(" "), messages = errors.map((item) => item.message).join(" "), evidence = `${keys} ${messages}`.toLowerCase(), diagnostic = errors.map((item) => `${item.key}: ${item.message}`).join("; ").slice(0, 500);
  if (httpStatus === 401 || httpStatus === 403 || /(?:^|\s)(?:token|api[_-]?key|authentication|authorization)(?:\s|$)/.test(keys) || /invalid (?:api )?key|missing (?:api )?key|authentication failed|unauthorized|not authenticated/.test(evidence)) return new FootballProviderAuthenticationError(httpStatus, diagnostic);
  if (httpStatus === 429 || /rate|quota|requests?/.test(keys) || /rate limit|quota exceeded|request limit|too many requests/.test(evidence)) return new FootballProviderRateLimitError(httpStatus, diagnostic);
  if (/plan|subscription|access|coverage/.test(keys) || /not available (?:on|for).*plan|subscription|plan does not|access (?:is )?(?:denied|restricted)|not included/.test(evidence)) return new FootballProviderAccessError(httpStatus, diagnostic);
  if (/season/.test(keys) || /invalid season|season.*(?:not available|unsupported|not found)/.test(evidence)) return new FootballProviderSeasonError(httpStatus, diagnostic);
  if (/parameter|parameters|country|league|search|fixture|team|date/.test(keys) || /invalid parameter|missing parameter|bad request/.test(evidence)) return new FootballProviderInvalidRequestError(httpStatus, diagnostic);
  return new FootballProviderResponseError("Provider returned an API-level error response.", 1, httpStatus, "provider-api", "provider_api_error", diagnostic);
}
export function safeProviderErrorDetails(error: unknown) { return error instanceof FootballProviderResponseError ? { category: error.providerCategory, code: error.providerCode, message: error.safeDiagnostic, httpStatus: error.httpStatus } : { category: "provider-api" as const, code: "provider_api_error", message: "Provider operation failed.", httpStatus: null }; }

function normalizeApiFixture(value: unknown): NormalizedFixture {
  const row = object(value), fixture = object(row.fixture), league = object(row.league), teams = object(row.teams), goals = object(row.goals), venue = object(fixture.venue), normalized = normalizeFixture({
    id: text(fixture.id), competitionId: text(league.id), homeTeamId: text(object(teams.home).id), awayTeamId: text(object(teams.away).id),
    kickoffAt: text(fixture.date), status: text(object(fixture.status).short), homeScore: numberOrNull(goals.home), awayScore: numberOrNull(goals.away),
  });
  return { ...normalized, round: text(league.round) || null, venueName: text(venue.name) || null, venueCity: text(venue.city) || null };
}

function normalizeFixtureMetadata(value: unknown, fixtureProviderId: string, fetchedAt: string, providerReference: string): NormalizedSnapshot {
  const row = object(value), fixture = object(row.fixture), league = object(row.league), score = object(row.score), venue = object(fixture.venue), status = object(fixture.status);
  const scorePart = (name: string) => { const part = object(score[name]); return { home: numberOrNull(part.home), away: numberOrNull(part.away) }; };
  return { fixtureProviderId, category: "other", payload: json({ round: text(league.round) || null, venue: { id: text(venue.id) || null, name: text(venue.name) || null, city: text(venue.city) || null }, referee: text(fixture.referee) || null, timezone: text(fixture.timezone) || null, status: { long: text(status.long) || null, short: text(status.short) || null, elapsed: numberOrNull(status.elapsed) }, score: { halftime: scorePart("halftime"), fulltime: scorePart("fulltime"), extratime: scorePart("extratime"), penalty: scorePart("penalty") } }), providerReference, fetchedAt };
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
  private readonly onRequest?: (audit: ApiFootballRequestAudit) => void;

  constructor(options: ApiFootballProviderOptions) {
    this.enabled = options.enabled;
    this.apiKey = options.apiKey;
    this.credentialConfigured = Boolean(options.apiKey);
    this.baseUrl = options.baseUrl ?? "https://v3.football.api-sports.io";
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.transport = options.transport ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.onRequest = options.onRequest;
  }

  estimateCompetitionRequests(categories: readonly string[] = ["metadata", "teams", "fixtures"]): number { return new Set(categories).size; }
  estimateFixtureRequests(categories: readonly string[] = ["form", "h2h", "injuries", "lineups", "statistics", "odds"]): number { return 1 + new Set(categories).size + (categories.includes("form") ? 1 : 0); }
  async getFixtures(): Promise<Fixture[]> { return []; }
  async getFixture(): Promise<Fixture | null> { return null; }
  async getTeamForm(teamId: string): Promise<TeamForm> { return { teamId, sequence: [], summary: "Persisted form is not available yet." }; }
  async getCompetition(): Promise<Competition | null> { return null; }
  async getResult(): Promise<Fixture | null> { return null; }

  async discoverCompetitions(parameters: { country: string; season: string; search?: string }): Promise<ApiFootballCompetitionCandidate[]> {
    const rows = await this.request("leagues", parameters, true);
    return rows.map((row) => { const item = object(row), league = object(item.league), country = object(item.country), providerId = normalizeProviderId(text(league.id)), name = text(league.name).trim(), countryName = text(country.name).trim(); if (!name || !countryName) throw new FootballProviderResponseError("Provider returned incomplete competition identity."); return { providerId, name, country: countryName, type: text(league.type) || null, seasons: array(item.seasons).map(normalizeSeason) }; });
  }

  async discoverCurrentCompetitions(country: string): Promise<ApiFootballCompetitionCandidate[]> {
    if (!country.trim()) throw new FootballProviderInvalidRequestError(null, "Discovery country was required.");
    const rows = await this.request("leagues", { country: country.trim(), current: "true" }, true);
    return rows.map((row) => { const item = object(row), league = object(item.league), providerCountry = object(item.country), providerId = normalizeProviderId(text(league.id)), name = text(league.name).trim(), countryName = text(providerCountry.name).trim(); if (!name || !countryName) throw new FootballProviderResponseError("Provider returned incomplete competition identity."); return { providerId, name, country: countryName, type: text(league.type) || null, seasons: array(item.seasons).map(normalizeSeason) }; });
  }

  async fetchCompetitionFixtures(competition: ApiFootballCompetitionCandidate, season: string, from: string, to: string): Promise<NormalizedFixture[]> {
    normalizeProviderId(competition.providerId); normalizeProviderId(season);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new FootballProviderInvalidRequestError(null, "Fixture window dates were invalid.");
    const rows = await this.request("fixtures", { league: competition.providerId, season, from, to });
    for (const value of rows) { const row = object(value), league = object(row.league); if (text(league.id) !== competition.providerId || text(league.season) !== season || text(league.name) !== competition.name || text(object(league.country).name || league.country) !== competition.country) throw new FootballProviderResponseError("Provider fixture competition or season identity did not match the verified mapping."); }
    return rows.map(normalizeApiFixture);
  }

  async fetchCompetitionTeams(competition: ApiFootballCompetitionCandidate, season: string): Promise<CompetitionIngestionPayload["teams"]> {
    normalizeProviderId(competition.providerId); normalizeProviderId(season);
    const rows = await this.request("teams", { league: competition.providerId, season }, true);
    return rows.map((value) => { const team = object(object(value).team), providerId = normalizeProviderId(text(team.id)), name = text(team.name).trim(); if (!name) throw new FootballProviderResponseError("Provider returned an incomplete team record."); return { providerId, competitionProviderId: competition.providerId, name, shortName: text(team.code) || null, logoUrl: text(team.logo) || null, country: text(team.country) || null }; });
  }

  async fetchSeasonFixtures(competition: ApiFootballCompetitionCandidate, season: string): Promise<NormalizedFixture[]> {
    normalizeProviderId(competition.providerId); normalizeProviderId(season);
    const rows = await this.request("fixtures", { league: competition.providerId, season });
    for (const value of rows) { const row = object(value), league = object(row.league); if (text(league.id) !== competition.providerId || text(league.season) !== season || text(league.name) !== competition.name || text(object(league.country).name || league.country) !== competition.country) throw new FootballProviderResponseError("Provider historical fixture competition or season identity did not match the verified mapping."); }
    return rows.map(normalizeApiFixture);
  }

  async getCompetitionMetadata(providerCompetitionId: string): Promise<ApiFootballCompetitionCandidate> {
    normalizeProviderId(providerCompetitionId);
    const rows = await this.request("leagues", { id: providerCompetitionId }, true);
    if (rows.length !== 1) throw new FootballProviderResponseError("Provider competition identity was ambiguous.");
    const item = object(rows[0]), league = object(item.league), country = object(item.country), returnedId = normalizeProviderId(text(league.id)), name = text(league.name).trim(), countryName = text(country.name).trim();
    if (returnedId !== providerCompetitionId || !name || !countryName) throw new FootballProviderResponseError("Provider returned mismatched competition metadata.");
    return { providerId: returnedId, name, country: countryName, type: text(league.type) || null, seasons: array(item.seasons).map(normalizeSeason) };
  }

  async fetchUpcomingCompetitionWindow(competition: ApiFootballCompetitionCandidate, season: string, from: string, to: string): Promise<ApiFootballFixtureWindow> {
    normalizeProviderId(competition.providerId); normalizeProviderId(season);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new FootballProviderInvalidRequestError(null, "Fixture window dates were invalid.");
    let requestCount = 0;
    try {
      requestCount++; const teamRows = await this.request("teams", { league: competition.providerId, season }, true);
      requestCount++; const fixtureRows = await this.request("fixtures", { league: competition.providerId, season, from, to });
      for (const value of fixtureRows) { const row = object(value), league = object(row.league), status = text(object(object(row.fixture).status).short).toUpperCase(); if (text(league.id) !== competition.providerId || text(league.season) !== season || text(league.name) !== competition.name || text(object(league.country).name || league.country) !== competition.country) throw new FootballProviderResponseError("Provider fixture competition or season identity did not match the verified mapping.", requestCount); if (!new Set(["NS", "TBD"]).has(status)) throw new FootballProviderResponseError("Provider returned a fixture outside the strict pre-kickoff status allowlist.", requestCount); }
      const teams = teamRows.map((value) => { const team = object(object(value).team), providerId = normalizeProviderId(text(team.id)), name = text(team.name).trim(); if (!name) throw new FootballProviderResponseError("Provider returned an incomplete team record.", requestCount); return { providerId, competitionProviderId: competition.providerId, name, shortName: text(team.code) || null, logoUrl: text(team.logo) || null, country: text(team.country) || null }; });
      return { competition, season, from, to, teams, fixtures: fixtureRows.map(normalizeApiFixture), fetchedAt: this.now().toISOString(), requestCount: 2 };
    } catch (error) { if (error instanceof FootballProviderResponseError) error.requestCount = Math.max(1, requestCount); throw error; }
  }

  async checkAuthentication(): Promise<{ httpStatus: number; keyAccepted: true; headerLimit: number | null; headerRemaining: number | null; subscriptionActive: boolean | null; subscriptionPlan: string | null; subscriptionDailyLimit: number | null; subscriptionDailyUsed: number | null }> {
    if (!this.enabled) throw new FootballProviderUnavailableError();
    if (!this.apiKey) throw new MissingFootballProviderKeyError();
    const url = new URL("status", `${this.baseUrl}/`), controller = new AbortController(), timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(url, { headers: { "x-apisports-key": this.apiKey }, signal: controller.signal });
      if (response.status === 401 || response.status === 403) throw new FootballProviderAuthenticationError(response.status);
      if (response.status === 429) throw new FootballProviderRateLimitError(response.status);
      if (!response.ok) throw new FootballProviderResponseError(`Provider returned HTTP ${response.status}.`, 1, response.status);
      const body = await response.json() as ApiEnvelope, errors = providerErrors(body?.errors, this.apiKey);
      if (errors.length) throw classifyProviderErrors(errors, response.status);
      if (!body || typeof body !== "object" || !("response" in body)) throw new MalformedFootballProviderResponseError(response.status, "Provider status response did not include a response field.");
      const numberHeader = (...names: string[]) => { for (const name of names) { const value = response.headers.get(name); if (value !== null) { const parsed = Number.parseInt(value, 10); if (Number.isFinite(parsed)) return parsed; } } return null; }, status = object(body.response), subscription = object(status.subscription), requests = object(status.requests);
      this.onRequest?.({ path: "status", parameters: {}, httpStatus: response.status, recordsReturned: 1, rateLimitRemaining: numberHeader("x-ratelimit-requests-remaining", "x-ratelimit-remaining") });
      return { httpStatus: response.status, keyAccepted: true, headerLimit: numberHeader("x-ratelimit-requests-limit", "x-ratelimit-limit"), headerRemaining: numberHeader("x-ratelimit-requests-remaining", "x-ratelimit-remaining"), subscriptionActive: typeof subscription.active === "boolean" ? subscription.active : null, subscriptionPlan: text(subscription.plan) || null, subscriptionDailyLimit: numberOrNull(requests.limit_day), subscriptionDailyUsed: numberOrNull(requests.current) };
    } catch (error) {
      if (error instanceof FootballProviderResponseError) throw error;
      if (error instanceof SyntaxError) throw new MalformedFootballProviderResponseError(null, "Provider response was not valid JSON.");
      throw new FootballProviderResponseError(error instanceof Error && error.name === "AbortError" ? "Provider request timed out." : "Provider authentication check failed.");
    } finally { clearTimeout(timeout); }
  }

  private async request(path: string, parameters: Record<string, string>, requireRows = false): Promise<unknown[]> {
    if (!this.enabled) throw new FootballProviderUnavailableError();
    if (!this.apiKey) throw new MissingFootballProviderKeyError();
    const url = new URL(path, `${this.baseUrl}/`); Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(url, { headers: { "x-apisports-key": this.apiKey }, signal: controller.signal });
      const remainingHeader = response.headers.get("x-ratelimit-requests-remaining") ?? response.headers.get("x-ratelimit-remaining"), remaining = remainingHeader === null ? null : Number.parseInt(remainingHeader, 10);
      if (response.status === 401 || response.status === 403) throw new FootballProviderAuthenticationError(response.status);
      if (response.status === 429) throw new FootballProviderRateLimitError(response.status);
      if (!response.ok) throw new FootballProviderResponseError(`Provider returned HTTP ${response.status}.`);
      const body = await response.json() as ApiEnvelope, errors = providerErrors(body?.errors, this.apiKey);
      if (errors.length) { this.onRequest?.({ path, parameters: { ...parameters }, httpStatus: response.status, recordsReturned: null, rateLimitRemaining: Number.isFinite(remaining) ? remaining : null }); throw classifyProviderErrors(errors, response.status); }
      if (!Array.isArray(body.response)) throw new MalformedFootballProviderResponseError(response.status, "Provider response array is missing or malformed.");
      if (body.paging !== undefined) { const paging = object(body.paging), current = numberOrNull(paging.current), total = numberOrNull(paging.total); if (current === null || total === null || current < 1 || total < 1 || current > total) throw new MalformedFootballProviderResponseError(response.status, "Provider pagination values were invalid."); }
      this.onRequest?.({ path, parameters: { ...parameters }, httpStatus: response.status, recordsReturned: body.response.length, rateLimitRemaining: Number.isFinite(remaining) ? remaining : null });
      if (requireRows && body.response.length === 0) throw new EmptyFootballProviderResponseError();
      return body.response;
    } catch (error) {
      if (error instanceof FootballProviderResponseError) throw error;
      if (error instanceof SyntaxError) throw new MalformedFootballProviderResponseError(null, "Provider response was not valid JSON.");
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
      const leagueRow = object(leagueRows[0] ?? fixtureRows[0]), league = object(leagueRow.league), country = object(leagueRow.country), fetchedAt = this.now().toISOString();
      if (leagueRows.length) { const returnedLeagueId = text(object(object(leagueRows[0]).league).id); if (!returnedLeagueId || returnedLeagueId !== providerCompetitionId) throw new FootballProviderResponseError("Provider competition metadata did not match the requested competition."); }
      const fixtures = fixtureRows.map(normalizeApiFixture);
      const snapshots: NormalizedSnapshot[] = categorySet.has("fixtures") || categorySet.has("results") ? fixtureRows.map((row, index) => normalizeFixtureMetadata(row, fixtures[index].providerId, fetchedAt, `fixtures?league=${providerCompetitionId}&season=${season}`)) : [];
      if (standingRows.length && fixtures[0]) snapshots.push({ fixtureProviderId: fixtures[0].providerId, category: "standings", payload: normalizeCategory("standings", standingRows), providerReference: `standings?league=${providerCompetitionId}&season=${season}`, fetchedAt });
      return {
        competition: { providerId: providerCompetitionId, name: text(league.name) || `Competition ${providerCompetitionId}`, country: text(country.name) || text(league.country) || null, season, enabled: true, priority: 100, providerType: text(league.type) || null },
        teams: teamRows.map((row) => { const item = object(row), team = object(item.team), providerId = normalizeProviderId(text(team.id)), name = text(team.name).trim(); if (!name) throw new FootballProviderResponseError("Provider returned an incomplete team record."); return { providerId, competitionProviderId: providerCompetitionId, name, shortName: text(team.code) || null, logoUrl: text(team.logo) || null, country: text(team.country) || null }; }),
        fixtures, snapshots, fetchedAt, requestCount,
      };
    } catch (error) { if (error instanceof FootballProviderResponseError) error.requestCount = Math.max(1, requestCount); throw error; }
  }

  async fetchFixtureData(providerFixtureId: string, categories: readonly string[] = ["form", "h2h", "injuries", "lineups", "statistics", "odds"]): Promise<FixtureRefreshPayload> {
    normalizeProviderId(providerFixtureId);
    let requestCount = 0, providerIdentity: FixtureRefreshPayload["providerIdentity"] | null = null;
    try {
      const fixtureRows = (requestCount++, await this.request("fixtures", { id: providerFixtureId }, true));
      if (!fixtureRows[0]) throw new FootballProviderResponseError("Provider fixture was not found.", requestCount);
      const fixture = normalizeApiFixture(fixtureRows[0]), row = object(fixtureRows[0]), teams = object(row.teams), league = object(row.league), home = text(object(teams.home).id), away = text(object(teams.away).id), season = text(league.season), fetchedAt = this.now().toISOString(); providerIdentity = { fixtureId: fixture.providerId, leagueId: fixture.competitionProviderId, season, homeTeamId: home, awayTeamId: away };
      const requests: [NormalizedSnapshot["category"], string, Record<string, string>][] = [
        ["h2h", "fixtures/headtohead", { h2h: `${home}-${away}`, last: "10" }], ["injuries", "injuries", { fixture: providerFixtureId }], ["lineups", "fixtures/lineups", { fixture: providerFixtureId }], ["statistics", "fixtures/statistics", { fixture: providerFixtureId }], ["odds", "odds", { fixture: providerFixtureId }], ["standings", "standings", { league: fixture.competitionProviderId, season }],
      ];
      const requested = new Set(categories), snapshots: NormalizedSnapshot[] = [];
      if (requested.has("form")) {
        requestCount++; const homeForm = await this.request("fixtures", { team: home, last: "5" });
        requestCount++; const awayForm = await this.request("fixtures", { team: away, last: "5" });
        if (homeForm.length || awayForm.length) snapshots.push({ fixtureProviderId: providerFixtureId, category: "form", payload: json({ homeTeamProviderId: home, awayTeamProviderId: away, home: normalizeCategory("form", homeForm), away: normalizeCategory("form", awayForm) }), providerReference: `fixtures?teams=${home},${away}&last=5`, fetchedAt });
      }
      for (const [category, endpoint, parameters] of requests) { if (!requested.has(category)) continue; requestCount++; const rows = await this.request(endpoint, parameters); if (rows.length) snapshots.push({ fixtureProviderId: providerFixtureId, category, payload: normalizeCategory(category, rows), providerReference: `${endpoint}?fixture=${providerFixtureId}`, fetchedAt }); }
      return { fixture, snapshots, fetchedAt, requestCount, providerIdentity };
    } catch (error) { if (error instanceof FootballProviderResponseError) { error.requestCount = Math.max(1, requestCount); error.providerIdentity = providerIdentity; throw error; } const normalized = new FootballProviderNormalizationError(); normalized.requestCount = Math.max(1, requestCount); normalized.providerIdentity = providerIdentity; throw normalized; }
  }
}
