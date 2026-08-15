import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

export interface PersistedFootballRows {
  competitions: Database["public"]["Tables"]["competitions"]["Row"][];
  teams: Database["public"]["Tables"]["teams"]["Row"][];
  fixtures: Database["public"]["Tables"]["fixtures"]["Row"][];
  reports: Database["public"]["Tables"]["intelligence_reports"]["Row"][];
  markets: Database["public"]["Tables"]["prediction_markets"]["Row"][];
  snapshots: Array<{ id: string; fixture_id: string; data_type: string; payload: Json; is_demo: boolean }>;
  catalog: Array<{ report_id: string; fixture_id: string; access_level: "public" | "registered" | "premium" }>;
}
export interface FootballExperienceRepository { read(): Promise<PersistedFootballRows> }

export class SupabaseFootballExperienceRepository implements FootballExperienceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}
  async read(): Promise<PersistedFootballRows> {
    const catalog = await this.client.rpc("list_consumer_prediction_catalog");
    if (catalog.error) throw new Error("Football data is temporarily unavailable.");
    const catalogRows = catalog.data ?? [], fixtureIds = [...new Set(catalogRows.map((item) => item.fixture_id))];
    const empty = <T,>() => Promise.resolve({ data: [] as T[], error: null });
    const competitions = await this.client.from("competitions").select("*").eq("enabled", true).order("priority").limit(30);
    if (competitions.error) throw new Error("Football data is temporarily unavailable.");
    const competitionIds = (competitions.data ?? []).map((item) => item.id);
    const [teams, fixtures, reports, markets, snapshots] = await Promise.all([
      this.client.from("teams").select("*").limit(200),
      competitionIds.length ? this.client.from("fixtures").select("*").in("competition_id", competitionIds).eq("is_demo", false).order("kickoff_at").limit(3000) : empty<Database["public"]["Tables"]["fixtures"]["Row"]>(),
      fixtureIds.length ? this.client.from("intelligence_reports").select("*").in("fixture_id", fixtureIds).eq("status", "published").eq("consumer_publication_state", "PUBLISHED").eq("is_demo", false).order("generated_at", { ascending: false }) : empty<Database["public"]["Tables"]["intelligence_reports"]["Row"]>(),
      fixtureIds.length ? this.client.from("prediction_markets").select("*").order("sort_order").limit(100) : empty<Database["public"]["Tables"]["prediction_markets"]["Row"]>(),
      this.client.from("football_data_snapshots").select("id,fixture_id,data_type,payload,is_demo").eq("is_demo", false).limit(1000),
    ]);
    const responses = [teams, fixtures, reports, markets, snapshots];
    const failed = responses.find((response) => response.error);
    if (failed?.error) throw new Error("Football data is temporarily unavailable.");
    return { competitions: competitions.data ?? [], teams: teams.data ?? [], fixtures: fixtures.data ?? [], reports: reports.data ?? [], markets: markets.data ?? [], snapshots: snapshots.data ?? [], catalog: catalogRows };
  }
}
