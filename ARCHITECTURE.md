# ScoreGPT intelligence architecture

ScoreGPT keeps its existing App Router structure and adds one incremental domain module at `modules/intelligence`. No disruptive `src/` migration is required.

## Runtime flow

`app` and reusable `components` → `modules/intelligence/application.ts` → application services → repository interfaces → mock repositories → structured mock dataset.

Pages never import the mock dataset. `application.ts` is the composition root that selects implementations and constructs services. Today it selects mock repositories because `featureFlags.useMockFootballData` is enabled.

## Domain

`domain.ts` contains provider-neutral football and intelligence models: competitions, teams, fixtures, form, statistics, predictions, reasoning, confidence, risk, results and intelligence reports. It also validates confidence ranges and status values.

## Repositories and services

`repositories.ts` defines narrow read contracts for fixtures, predictions, competitions and results. `mock-repositories.ts` implements those contracts with local demo-safe records. `services.ts` handles fixture lookup, prediction retrieval, public result filtering and construction of the central `IntelligenceReport`.

## Replacing mock football data

Implement `FootballDataProvider` in `providers.ts` for the chosen vendor, then add provider-backed repository adapters that normalize vendor responses into core domain objects. Update only the composition root to select those repositories when live football data is enabled. Provider-specific response types stay inside that adapter.

## Adding AI generation

Implement `AIIntelligenceProvider.generateMatchIntelligence()` using normalized `AIIntelligenceInput`. The adapter must return the provider-neutral intelligence model. The `IntelligenceService` can then select generated analysis when `aiGenerationEnabled` is true, while retaining structured fallback behavior.

## UI consumption

The homepage uses `getHomepageFootballData()`. `/matches` uses `getMatchCentreData()`. `/matches/[fixtureId]` uses `IntelligenceService`. `/results` uses `ResultsService`. Only the filtering controls require client-side JavaScript; all data composition happens in server components.

## Safety

Every relevant record contains `sourceType`, `isDemo` and a source label. Live-data and AI flags remain disabled. The application requires no environment variables or external requests.

## Batch 2C interactive experience

The Match Centre remains a server-composed page. `getMatchCentreData()` resolves fixtures, predictions, competitions and team form through services, then passes serializable provider-neutral view data to the small `MatchCentre` client island. Search, competition, status and date filtering happen locally against that prepared data. A future repository can honor the same date and competition contracts before the client receives the collection.

The match detail route asks `IntelligenceService` for one `IntelligenceReport`. Its reusable visuals—confidence gauge, probability bars, risk indicator, team-form strip, mini statistic and freshness badge—accept domain values rather than provider payloads or brand constants. Native browser sharing is isolated in `ShareReport`; all other report composition remains server-rendered. Route-level loading and not-found boundaries provide future API-safe states without exposing internal errors.

The Results Centre uses `getResultsCentreData()` to join public result records to their prediction and competition through services. Its client island performs status, team, competition and publication-date filtering. Demo performance metrics are calculated from the same service-composed records and are explicitly labelled as demonstration data; losses and void records remain visible.

The homepage continues to consume `getHomepageFootballData()` from the composition root for featured intelligence, the match ticker, prediction cards and recent results. No UI component imports the mock dataset.

Future premium presentation can be added as provider-neutral metadata on an intelligence report or report section, then interpreted by a dedicated entitlement boundary. Authentication and real entitlement enforcement should sit outside the visual components so neither the report UI nor provider adapters require rewrites.

## Batch 2D authentication and membership foundation

The account module follows the existing composition pattern: UI → `AuthService`, `MembershipService` and `PredictionEntitlementService` → provider/repository contracts → mock implementations. `modules/account/application.ts` is the composition root. Pages and components never import mock users or membership records directly.

`AuthProvider` defines current-user, session, sign-in, registration, sign-out, password-reset and password-update boundaries. `MockAuthProvider` stores only a safe demo user identifier in `sessionStorage`; it stores no password, token or JWT. Registration creates a temporary free-member presentation state, and explicit Demo Access selects Free, Premium or Admin review identities. All state resets when the browser session ends and is not a real user record.

`MembershipRepository` resolves the provider-neutral Free or Premium membership and status. `MembershipService` supplies display-ready state and answers Premium access. A future database repository can replace `MockMembershipRepository` without changing pages. Payment code is intentionally absent; a future Paystack webhook or billing integration will update durable membership records outside `MembershipService`.

`PredictionUsageRepository` tracks unique fixture views temporarily. The configured V1 mock strategy is a lifetime welcome allowance within the current temporary browser session. The allowance value lives in `entitlementConfig`, never in report components. `PredictionEntitlementService` returns one `PredictionAccessDecision` covering guest authentication requirements, remaining access, exhausted allowances, Premium access and upgrade requirements.

Predictions can carry `ContentAccessLevel` metadata: `public`, `registered` or `premium`. `ReportAccessGate` consumes the entitlement decision consistently. The featured Arsenal demonstration remains public, selected reports demonstrate free-member unlocking, and Premium-marked reports demonstrate the upgrade path.

`ProtectedView` is the reusable mock route boundary for `/dashboard`, `/account` and `/admin`, including admin-role authorization. Because this batch deliberately has no secure server session, this is presentation-layer protection only. When live authentication arrives, it must be replaced by server-side `requireAuth()`/`requireMembership()` checks backed by provider-managed sessions.

The future migration is deliberately narrow: `MockAuthProvider` → `SupabaseAuthProvider`, `MockMembershipRepository` → `SupabaseMembershipRepository`, and `MockPredictionUsageRepository` → `SupabasePredictionUsageRepository`. Secure session cookies and server-side authorization replace temporary browser state; pages, forms, membership UI and entitlement decision consumers retain the same contracts.

## Batch 3C deterministic AI intelligence

`IntelligenceService` now delegates complete report generation to the configured `AIIntelligenceProvider`. It supplies only normalized provider-neutral inputs: fixture, competition, team form and match statistics. The composition root selects `MockAIIntelligenceProvider`; neither the service nor UI imports deterministic generation rules.

The mock provider calculates reproducible confidence and risk from structured form and comparison values, then returns a complete `IntelligenceReport`. Reports include nine market analyses, a recommended market, avoid-market guidance, natural-language match and team-form summaries, strengths, weaknesses, tactical styles, expected match flow, confidence explanation and risk factors. Fixed source timestamps and input-derived rules ensure the same normalized input produces the same report.

Confidence uses four provider-neutral levels: Very High, High, Medium and Low. Risk remains Low, Medium or High and includes both structured factors and an explanation. These values are consumed by shared visual components across the report and homepage.

There are no prompts, model SDKs, network calls or environment requirements in the mock provider. A future `OpenAIProvider` implements the same `AIIntelligenceProvider` contract and returns the same `IntelligenceReport` shape. The service, report page, homepage and business logic require no corresponding rewrite.

## Batch 3D payment and billing foundation

Billing follows the same layered structure: checkout/admin UI → `PaymentService` and `PlatformOrderService` → `PaymentProvider` and `PlatformOrderRepository` contracts → configured adapters and mock storage. Provider selection occurs in the billing composition root using central payment configuration.

The provider-neutral domain models payment methods, money, platform setup orders, invoices, transactions, subscriptions, billing intervals and tenant payment settings. Order status supports Pending Payment, Payment Submitted, Payment Verified, Payment Rejected, Cancelled and Completed. Monthly, yearly and lifetime membership billing intervals are modelled but not processed.

`ManualBankTransferProvider` is the currently enabled business setup method. It creates a pending-payment instruction result and never claims automated verification. Official business account details live only in payment configuration and are rendered only in checkout. The WhatsApp handoff prepares a package-specific message; customers attach their receipt manually and FABRO TECH LIMITED verifies it outside the application.

`PaystackPaymentProvider`, `FlutterwavePaymentProvider` and `StripePaymentProvider` implement the provider contract as isolated placeholders and throw `Not implemented.`. They contain no SDKs, keys or network requests. Stripe is not offered in the Nigerian checkout method selector. A later provider becomes active by configuration and implements the same create, verify, cancel and refund methods; checkout does not require a rewrite.

`MockPlatformOrderRepository` supplies demonstration orders for the admin-only review screen. Approval, rejection and cancellation controls change local presentation state only. There is no database, durable order, transaction verification, webhook or real administrative payment action in this batch.

## Batch 4A Supabase database foundation

The first durable persistence layer is versioned in `supabase/migrations`. It introduces provider-neutral football cache, stored intelligence, membership, usage, order and transaction records with UUID relationships, freshness timestamps and RLS on every table. Development seed records are explicitly tagged `is_demo` and use the `scoregpt-demo` provider.

Supabase clients live under `lib/supabase`; repository adapters live under `modules/persistence`. UI modules continue to consume services and repository contracts rather than querying tables. `createPersistenceRepositories()` defaults to existing mocks and selects Supabase only when configuration explicitly requests it and a client is supplied, so an unavailable Development project cannot break the public review site.

This batch does not activate the new persistence path in live authentication, intelligence or billing flows. See `DATABASE.md` for schema, policies, migration operations, environment safety and the cache freshness model.
