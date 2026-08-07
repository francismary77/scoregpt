# ScoreGPT Supabase database foundation

## Scope

Batch 4A introduces reproducible PostgreSQL schema, RLS policies, safe demo seed data, typed Supabase clients and provider-neutral repository adapters. It does not enable live authentication, football APIs, AI providers, payments, webhooks or subscriptions.

## Schema

The initial migration creates eleven tables:

- `profiles`: one application profile per Supabase Auth user, with `user` or `admin` role and account status.
- `memberships`: provider-neutral plan history and lifecycle dates.
- `prediction_usage`: user-owned report/fixture usage events.
- `competitions`, `teams`, `fixtures`: normalized football catalogue and schedule data.
- `football_data_snapshots`: JSON cache entries for form, standings, injuries, lineups, H2H and statistics, including fetch and expiry timestamps.
- `intelligence_reports`, `prediction_markets`: stored reports and ordered market recommendations, independent of an AI vendor.
- `orders`, `payment_transactions`: provider-neutral commercial orders and payment records. Amounts are stored in minor currency units.

All primary keys are UUIDs. Foreign keys preserve ownership and football relationships. Provider IDs are stored separately from internal IDs so vendors can be replaced without changing application identity.

## Migrations and seeds

`supabase/migrations/202608070001_batch_4a_foundation.sql` is the source of truth. Apply it through the Supabase CLI or the Development project's SQL editor. Production must receive the same checked-in migration, never a hand-built dashboard variant.

`supabase/seed.sql` is development-only. Its records use the `scoregpt-demo` provider and `is_demo = true`. The report is labelled as deterministic demonstration content and the seed creates no orders, transactions, user usage or fabricated historical results.

## Row Level Security

RLS is enabled on every Batch 4A table.

- Authenticated users can read their own profile, membership, usage, orders and related transactions.
- Users can update only their profile `display_name`; role and account status remain privileged fields.
- Authenticated users can insert their own usage events.
- Enabled football catalogue and fixture records are publicly readable.
- Anonymous users can read only published reports whose access level is `public`.
- Authenticated users can read `public` and `registered` reports. `premium` reports require a current Premium membership.
- Administrative writes have no browser policy. Future trusted server workflows must perform them with server-only privileged credentials that are never exposed to client code.

The `is_admin()` helper is `security definer`, has a fixed empty search path, and is executable only by authenticated users. The Auth user trigger creates a minimal profile; live authentication wiring remains deferred to Batch 4B.

## Repository architecture

Supabase access lives under `lib/supabase` and `modules/persistence`. Pages and components do not query Supabase.

`createPersistenceRepositories(client)` selects mock repositories by default. Browser and server composition helpers select Supabase adapters only when `NEXT_PUBLIC_DATA_REPOSITORY=supabase` and the public Supabase configuration is present. Missing configuration therefore leaves the public review site on deterministic mocks rather than breaking it.

The Supabase adapters currently cover membership, prediction usage, platform orders, cached football snapshots and stored intelligence reports. Existing mock adapters remain the active application path until a later batch wires real sessions and server authorization.

## Environment variables

Required when Supabase mode is enabled:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_DATA_REPOSITORY=supabase
```

The publishable key is designed for browser use and remains constrained by RLS. Do not put a service-role key, database password or access token in any `NEXT_PUBLIC_` variable. `.env.example` contains names only; `.env.local` and all other real environment files are ignored.

## Cache and freshness flow

The intended runtime path is:

`football provider -> normalized snapshots -> intelligence engine -> stored report -> application`

Snapshots store `fetched_at` and `expires_at`. Repository consumers classify a present record as `fresh` when its expiry is in the future and `stale` otherwise; no row means `missing`. Future provider services will implement:

- fresh: serve the stored snapshot;
- stale: refresh once, store, then serve;
- missing: fetch, normalize, store, then serve.

Opening a match must read stored report/cache data first. No provider calls are implemented in this batch.

## Development to production

1. Link the Supabase CLI to the Development project and apply the checked-in migration.
2. Optionally load `supabase/seed.sql` in Development only.
3. Generate TypeScript database types from the applied Development schema and replace the maintained foundation type file if the schema changes.
4. Validate RLS with anonymous, standard authenticated and Premium test users.
5. Apply the identical reviewed migration to the Production project through the CLI/CI migration workflow.
6. Configure each deployment's public URL and publishable key in its environment manager; never copy secrets into source control.

## Still mocked

Authentication sessions, membership mutation, usage enforcement wiring, football provider fetching, AI generation, payment verification, subscriptions, email and Telegram remain mocked or disabled. Batch 4A adds storage contracts and schema only.
