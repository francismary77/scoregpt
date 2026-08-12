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
      team_competition_seasons: Table<BaseRow & { team_id: string; competition_id: string }>;
      fixtures: Table<BaseRow & { provider_fixture_id: string | null; provider: string; competition_id: string; home_team_id: string; away_team_id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; source: string; last_synced_at: string | null; is_demo: boolean }>;
      football_data_snapshots: Table<{ id: string; fixture_id: string; data_type: string; payload: Json; provider: string; fetched_at: string; expires_at: string | null; source_reference: string | null; is_demo: boolean; created_at: string; updated_at: string }>;
      football_provider_requests: Table<{ id: string; provider: string; category: string; endpoint: string; requested_at: string; request_count: number; succeeded: boolean; cache_state: "fresh" | "stale" | "missing"; refresh_reason: string; error_code: string | null; created_at: string }>;
      football_shadow_runs: Table<{ id: string; started_at: string; completed_at: string; mode: "DRY_RUN" | "SHADOW_PERSIST"; source_type: "PERSISTED_DATABASE" | "PERSISTED_DATABASE_WITH_PROVIDER_REFRESH"; operational_status: "COMPLETED" | "PARTIAL" | "FAILED"; horizon_start: string; horizon_end: string; fixtures_found: number; fixtures_eligible: number; predictions_created: number; predictions_persisted: number; predictions_reused: number; predictions_skipped: number; top_picks_calculated: number; provider_requests: number; errors_count: number; methodology_version: string; confidence_version: string; policy_version: string; failure_summary: string | null; created_at: string }>;
      football_shadow_predictions: Table<{ id: string; run_id: string; fixture_id: string; provider_fixture_id: string; competition_id: string; provider_competition_id: string; season: string; home_team_id: string; away_team_id: string; kickoff_at: string; prediction_created_at: string; evidence_cutoff_at: string; selected_outcome: "home" | "draw" | "away"; home_probability: number; draw_probability: number; away_probability: number; methodology_key: string; methodology_version: string; confidence_version: string; confidence_score_internal: number; confidence_label: "LOW" | "MODERATE" | "STRONG"; publishing_tier_calculated: "TOP_PICK" | "STANDARD_ANALYSIS" | "LIMITED_EVIDENCE"; publishing_policy_version: string; ranking_scope: "DAILY_GLOBAL"; ranking_date: string; ranking_position: number | null; eligible_population_size: number; is_top_pick_calculated: boolean; operational_publication_state: "SHADOW_ONLY" | "SUPPRESSED"; shadow_mode: true; settlement_status: "PENDING" | "SETTLED" | "VOID" | "CANCELLED" | "POSTPONED" | "ABANDONED" | "UNKNOWN_FINAL_STATE"; actual_home_goals: number | null; actual_away_goals: number | null; actual_outcome: "home" | "draw" | "away" | null; prediction_correct: boolean | null; settled_at: string | null; methodology_snapshot: Json; created_at: string; updated_at: string }>;
      intelligence_reports: Table<BaseRow & { fixture_id: string; provider: string; provider_version: string | null; status: string; recommended_market: string | null; confidence: number | null; risk_level: string | null; reasoning: string | null; analysis: Json; generated_at: string | null; source_data_fetched_at: string | null; source_reference: string | null; access_level: "public" | "registered" | "premium"; consumer_publication_state: "NOT_PUBLISHED" | "READY_FOR_REVIEW" | "PUBLISHED" | "WITHDRAWN"; forward_prediction_id: string | null; is_demo: boolean }>;
      prediction_markets: Table<BaseRow & { intelligence_report_id: string; market_type: string; prediction: string; confidence: number; risk_level: string; reasoning: string; sort_order: number }>;
      orders: Table<BaseRow & { order_number: string; user_id: string | null; buyer_name: string; buyer_email: string; buyer_phone: string | null; brand_name: string | null; package_id: string; package_name: string; amount_minor: number; currency: string; payment_method: string; status: string; verified_at: string | null }>;
      payment_transactions: Table<{ id: string; order_id: string; provider: string; reference: string; amount_minor: number; currency: string; status: string; metadata: Json; created_at: string; updated_at: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      list_consumer_prediction_catalog: { Args: Record<string, never>; Returns: Array<{ report_id: string; fixture_id: string; access_level: "public" | "registered" | "premium" }> };
      unlock_consumer_prediction: { Args: { p_fixture_id: string }; Returns: Array<{ report_id: string; already_unlocked: boolean; remaining: number }> };
      prepare_consumer_prediction: { Args: { p_forward_prediction_id: string; p_access_level?: "public" | "registered" | "premium" }; Returns: string };
      transition_consumer_prediction: { Args: { p_report_id: string; p_target_state: "NOT_PUBLISHED" | "READY_FOR_REVIEW" | "PUBLISHED" | "WITHDRAWN" }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
