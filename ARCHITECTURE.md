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
