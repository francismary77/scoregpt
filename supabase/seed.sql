-- Development-only deterministic records. Every row is explicitly marked as demo data.
-- Run after the Batch 4A migration with: supabase db reset (local) or paste into the
-- Development project's SQL editor. Never run this seed against production.

insert into public.competitions (id, provider_id, provider, name, country, season, enabled, priority, tier, is_demo)
values
  ('10000000-0000-4000-8000-000000000001', 'demo-premier-league', 'scoregpt-demo', 'Premier League', 'England', '2026', true, 10, 'featured', true),
  ('10000000-0000-4000-8000-000000000002', 'demo-serie-a', 'scoregpt-demo', 'Serie A', 'Italy', '2026', true, 20, 'standard', true)
on conflict (provider, provider_id, season) do nothing;

insert into public.teams (id, provider_id, provider, competition_id, name, short_name, country, is_demo)
values
  ('20000000-0000-4000-8000-000000000001', 'demo-arsenal', 'scoregpt-demo', '10000000-0000-4000-8000-000000000001', 'Arsenal', 'ARS', 'England', true),
  ('20000000-0000-4000-8000-000000000002', 'demo-chelsea', 'scoregpt-demo', '10000000-0000-4000-8000-000000000001', 'Chelsea', 'CHE', 'England', true),
  ('20000000-0000-4000-8000-000000000003', 'demo-inter', 'scoregpt-demo', '10000000-0000-4000-8000-000000000002', 'Inter', 'INT', 'Italy', true),
  ('20000000-0000-4000-8000-000000000004', 'demo-atalanta', 'scoregpt-demo', '10000000-0000-4000-8000-000000000002', 'Atalanta', 'ATA', 'Italy', true)
on conflict (provider, provider_id) do nothing;

insert into public.fixtures (id, provider_fixture_id, provider, competition_id, home_team_id, away_team_id, kickoff_at, status, source, is_demo)
values
  ('30000000-0000-4000-8000-000000000001', 'demo-ars-che', 'scoregpt-demo', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '2026-08-09T15:30:00Z', 'scheduled', 'scoregpt-demo', true),
  ('30000000-0000-4000-8000-000000000002', 'demo-int-ata', 'scoregpt-demo', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', '2026-08-09T18:45:00Z', 'scheduled', 'scoregpt-demo', true)
on conflict (provider, provider_fixture_id) do nothing;

insert into public.intelligence_reports (id, fixture_id, provider, provider_version, status, recommended_market, confidence, risk_level, reasoning, analysis, generated_at, source_data_fetched_at, source_reference, access_level, is_demo)
values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'mock-ai',
  'batch-3c-deterministic-v1',
  'published',
  'Double Chance',
  80,
  'low',
  'Deterministic demonstration report generated from existing ScoreGPT mock inputs.',
  '{"summary":"Development seed report","isDemo":true}'::jsonb,
  '2026-08-07T12:00:00Z',
  '2026-08-07T11:55:00Z',
  'scoregpt-demo-seed',
  'public',
  true
)
on conflict (id) do nothing;

insert into public.prediction_markets (intelligence_report_id, market_type, prediction, confidence, risk_level, reasoning, sort_order)
values ('40000000-0000-4000-8000-000000000001', 'double-chance', 'Arsenal or Draw', 80, 'low', 'Deterministic demonstration market; not a historical result.', 1)
on conflict (intelligence_report_id, market_type) do nothing;
