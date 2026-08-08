import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { HistoricalDataset } from "./historical";

export async function readPersistedHistoricalDataset(client: SupabaseClient<Database>, provider: string, providerCompetitionId: string, season: string): Promise<HistoricalDataset> {
  const competition = await client.from("competitions").select("id,provider_id,name,country,season").eq("provider", provider).eq("provider_id", providerCompetitionId).eq("season", season).single();
  if (competition.error) throw new Error("Historical competition read failed.");
  const [teams, fixtures, snapshots] = await Promise.all([
    client.from("teams").select("id,provider_id,name").eq("provider", provider).eq("competition_id", competition.data.id),
    client.from("fixtures").select("id,provider_fixture_id,kickoff_at,status,home_team_id,away_team_id,home_score,away_score").eq("provider", provider).eq("competition_id", competition.data.id).order("kickoff_at"),
    client.from("football_data_snapshots").select("fixture_id,payload").eq("provider", provider).eq("data_type", "other"),
  ]);
  if (teams.error || fixtures.error || snapshots.error) throw new Error("Historical football read failed.");
  const rounds = new Map((snapshots.data ?? []).map((snapshot) => [snapshot.fixture_id, typeof snapshot.payload === "object" && snapshot.payload && !Array.isArray(snapshot.payload) && typeof snapshot.payload.round === "string" ? snapshot.payload.round : null]));
  return {
    competition: { id: competition.data.id, providerId: competition.data.provider_id!, name: competition.data.name, country: competition.data.country, season: competition.data.season },
    teams: (teams.data ?? []).flatMap((team) => team.provider_id ? [{ id: team.id, providerId: team.provider_id, name: team.name }] : []),
    fixtures: (fixtures.data ?? []).flatMap((fixture) => fixture.provider_fixture_id ? [{ id: fixture.id, providerFixtureId: fixture.provider_fixture_id, kickoffAt: fixture.kickoff_at, status: fixture.status, homeTeamId: fixture.home_team_id, awayTeamId: fixture.away_team_id, homeScore: fixture.home_score, awayScore: fixture.away_score, round: rounds.get(fixture.id) ?? null }] : []),
  };
}
