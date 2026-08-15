import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { HistoricalFixture } from "@/modules/football-data/historical";
import type { ShadowFixtureSource, SupportedShadowCompetition } from "@/modules/football-intelligence/shadow-pipeline";
import { MAX_EVALUATION_HORIZON_HOURS } from "@/modules/football-intelligence/prediction-horizon";
import { historicalLeagueTargets } from "@/modules/football-data/historical-expansion";

type Client = SupabaseClient<Database>;
const fixture = (row: Database["public"]["Tables"]["fixtures"]["Row"], evidence: NonNullable<HistoricalFixture["evidence"]>): HistoricalFixture => ({ id: row.id, providerFixtureId: row.provider_fixture_id ?? "", kickoffAt: row.kickoff_at, status: row.status, homeTeamId: row.home_team_id, awayTeamId: row.away_team_id, homeScore: row.home_score, awayScore: row.away_score, evidence });

/** Privileged, server-only and database-first. This adapter never calls a football provider. */
export async function loadPersistedShadowFixtureSources(client: Client, allowlist: readonly SupportedShadowCompetition[], now: string, horizonHours = 72): Promise<ShadowFixtureSource[]> {
  if (!Number.isInteger(horizonHours) || horizonHours < 1 || horizonHours > MAX_EVALUATION_HORIZON_HOURS) throw new Error("Invalid persisted-fixture horizon.");
  const horizonEnd = new Date(new Date(now).getTime() + horizonHours * 3_600_000).toISOString(), sources: ShadowFixtureSource[] = [];
  for (const supported of allowlist.filter((item) => item.enabled)) {
    const competitionResult = await client.from("competitions").select("id,provider_id,name,country,season,provider,enabled").eq("provider_id", supported.providerCompetitionId).eq("season", supported.season).eq("enabled", true).limit(2);
    if (competitionResult.error) throw new Error("Persisted shadow competition lookup failed.");
    const matches = (competitionResult.data ?? []).filter((row) => row.provider_id === supported.providerCompetitionId && row.season === supported.season && row.name === (supported.providerName ?? supported.name) && row.country === supported.country);
    if (matches.length !== 1) continue;
    const competition = matches[0], previousTarget = historicalLeagueTargets.find((target) => target.id === supported.internalCompetitionId && target.providerId === supported.providerCompetitionId), previousSeason = previousTarget?.season ?? "__unconfigured__", previousCompetitionResult = await client.from("competitions").select("id,provider_id,name,country,season,provider,enabled").eq("provider_id", supported.providerCompetitionId).eq("season", previousSeason).eq("provider", "api-football").limit(2);
    if (previousCompetitionResult.error) throw new Error("Persisted previous-season competition lookup failed.");
    const previousMatches = (previousCompetitionResult.data ?? []).filter((row) => row.provider_id === supported.providerCompetitionId && row.season === previousSeason && row.name === (supported.providerName ?? supported.name) && row.country === supported.country);
    const previousCompetition = previousMatches.length === 1 ? previousMatches[0] : null;
    const [membershipResult, historyResult, upcomingResult, previousHistoryResult] = await Promise.all([
      client.from("team_competition_seasons").select("team_id").eq("competition_id", competition.id),
      client.from("fixtures").select("*").eq("competition_id", competition.id).eq("status", "finished").lt("kickoff_at", now).order("kickoff_at"),
      client.from("fixtures").select("*").eq("competition_id", competition.id).gt("kickoff_at", now).lte("kickoff_at", horizonEnd).order("kickoff_at"),
      previousCompetition ? client.from("fixtures").select("*").eq("competition_id", previousCompetition.id).eq("status", "finished").lt("kickoff_at", now).order("kickoff_at") : Promise.resolve({ data: [], error: null }),
    ]);
    if (membershipResult.error || historyResult.error || upcomingResult.error || previousHistoryResult.error) throw new Error("Persisted shadow fixture source read failed.");
    const teamIds = (membershipResult.data ?? []).map((row) => row.team_id), teamsResult = teamIds.length ? await client.from("teams").select("id,provider_id,name").in("id", teamIds) : { data: [], error: null };
    if (teamsResult.error) throw new Error("Persisted shadow fixture source read failed.");
    const currentEvidence = { competitionId: competition.id, providerCompetitionId: supported.providerCompetitionId, competitionName: competition.name, season: competition.season, source: "current-season" as const };
    const previousEvidence = previousCompetition ? { competitionId: previousCompetition.id, providerCompetitionId: supported.providerCompetitionId, competitionName: previousCompetition.name, season: previousCompetition.season, source: "previous-season" as const } : null;
    sources.push({ supportedCompetition: supported, dataset: { competition: { id: competition.id, providerId: competition.provider_id ?? supported.providerCompetitionId, name: competition.name, country: competition.country, season: competition.season }, teams: (teamsResult.data ?? []).flatMap((row) => row.provider_id ? [{ id: row.id, providerId: row.provider_id, name: row.name }] : []), fixtures: [...(historyResult.data ?? []).map((row) => fixture(row, currentEvidence)), ...(previousEvidence ? (previousHistoryResult.data ?? []).map((row) => fixture(row, previousEvidence)) : [])] }, upcomingFixtures: (upcomingResult.data ?? []).map((row) => fixture(row, currentEvidence)) });
  }
  return sources;
}
