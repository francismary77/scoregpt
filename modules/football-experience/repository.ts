import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

export interface PersistedFootballRows {
  competitions: Database["public"]["Tables"]["competitions"]["Row"][];
  teams: Database["public"]["Tables"]["teams"]["Row"][];
  fixtures: Database["public"]["Tables"]["fixtures"]["Row"][];
  reports: Database["public"]["Tables"]["intelligence_reports"]["Row"][];
  markets: Database["public"]["Tables"]["prediction_markets"]["Row"][];
  snapshots: Array<{ id: string; fixture_id: string; data_type: string; payload: Json; is_demo: boolean }>;
}
export interface FootballExperienceRepository { read(): Promise<PersistedFootballRows> }

export class SupabaseFootballExperienceRepository implements FootballExperienceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}
  async read(): Promise<PersistedFootballRows> {
    const [competitions, teams, fixtures, reports, markets, snapshots] = await Promise.all([
      this.client.from("competitions").select("*").eq("enabled", true).order("priority").limit(30),
      this.client.from("teams").select("*").limit(200),
      this.client.from("fixtures").select("*").order("kickoff_at").limit(100),
      this.client.from("intelligence_reports").select("*").eq("status", "published").eq("access_level", "public").order("generated_at", { ascending: false }).limit(30),
      this.client.from("prediction_markets").select("*").order("sort_order").limit(100),
      this.client.from("football_data_snapshots").select("id,fixture_id,data_type,payload,is_demo").limit(200),
    ]);
    const responses = [competitions, teams, fixtures, reports, markets, snapshots];
    const failed = responses.find((response) => response.error);
    if (failed?.error) throw new Error("Football data is temporarily unavailable.");
    return { competitions: competitions.data ?? [], teams: teams.data ?? [], fixtures: fixtures.data ?? [], reports: reports.data ?? [], markets: markets.data ?? [], snapshots: snapshots.data ?? [] };
  }
}
