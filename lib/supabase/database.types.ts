export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type BaseRow = { id: string; created_at: string; updated_at: string };
type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<BaseRow & { user_id: string; display_name: string | null; email: string | null; role: "user" | "admin"; account_status: "active" | "suspended" | "disabled" }>;
      memberships: Table<BaseRow & { user_id: string; plan: string; status: string; starts_at: string | null; expires_at: string | null; source: string; provider_reference: string | null }>;
      prediction_usage: Table<{ id: string; user_id: string; fixture_id: string | null; report_id: string | null; usage_type: string; created_at: string }>;
      competitions: Table<BaseRow & { provider_id: string | null; provider: string; name: string; country: string | null; season: string; enabled: boolean; priority: number; tier: string; last_synced_at: string | null; is_demo: boolean }>;
      teams: Table<BaseRow & { provider_id: string | null; provider: string; competition_id: string | null; name: string; short_name: string | null; logo_url: string | null; country: string | null; last_synced_at: string | null; is_demo: boolean }>;
      fixtures: Table<BaseRow & { provider_fixture_id: string | null; provider: string; competition_id: string; home_team_id: string; away_team_id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; source: string; last_synced_at: string | null; is_demo: boolean }>;
      football_data_snapshots: Table<{ id: string; fixture_id: string; data_type: string; payload: Json; provider: string; fetched_at: string; expires_at: string | null; source_reference: string | null; is_demo: boolean; created_at: string; updated_at: string }>;
      intelligence_reports: Table<BaseRow & { fixture_id: string; provider: string; provider_version: string | null; status: string; recommended_market: string | null; confidence: number | null; risk_level: string | null; reasoning: string | null; analysis: Json; generated_at: string | null; source_data_fetched_at: string | null; source_reference: string | null; access_level: "public" | "registered" | "premium"; is_demo: boolean }>;
      prediction_markets: Table<BaseRow & { intelligence_report_id: string; market_type: string; prediction: string; confidence: number; risk_level: string; reasoning: string; sort_order: number }>;
      orders: Table<BaseRow & { order_number: string; user_id: string | null; buyer_name: string; buyer_email: string; buyer_phone: string | null; brand_name: string | null; package_id: string; package_name: string; amount_minor: number; currency: string; payment_method: string; status: string; verified_at: string | null }>;
      payment_transactions: Table<{ id: string; order_id: string; provider: string; reference: string; amount_minor: number; currency: string; status: string; metadata: Json; created_at: string; updated_at: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
