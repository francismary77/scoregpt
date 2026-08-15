import "tsx/esm";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const {getFootballOrchestrationConfig}=await import("../modules/football-orchestration/config.ts");
const {getServerFootballProviderConfig}=await import("../modules/football-data/server-config.ts");

test("enrichment is independently controlled, bounded and fails closed",()=>{const off=getFootballOrchestrationConfig({});assert.equal(off.enrichmentEnabled,false);assert.equal(off.maxEnrichmentFixturesPerRun,2);assert.equal(off.maxEnrichmentRequestsPerRun,12);const on=getFootballOrchestrationConfig({FOOTBALL_FIXTURE_ENRICHMENT_ENABLED:"true",FOOTBALL_ENRICHMENT_MAX_FIXTURES_PER_RUN:"999",FOOTBALL_ENRICHMENT_MAX_REQUESTS_PER_RUN:"999"});assert.equal(on.enrichmentEnabled,true);assert.equal(on.maxEnrichmentFixturesPerRun,10);assert.equal(on.maxEnrichmentRequestsPerRun,50)});
test("specific enrichment access does not enable broad ingestion controls",()=>{const env={FOOTBALL_DATA_PROVIDER:"api-football",FOOTBALL_FIXTURE_ENRICHMENT_ENABLED:"true",FOOTBALL_API_KEY:"present"};assert.equal(getServerFootballProviderConfig(env).enabled,true);const controls=getFootballOrchestrationConfig(env);assert.equal(controls.providerEnabled,false);assert.equal(controls.providerCallsEnabled,false);assert.equal(controls.ingestionDryRun,true)});
test("enrichment uses the 168h persisted-fixture window, priority and request ceilings",async()=>{const source=await read("modules/football-orchestration/service.ts");assert.match(source,/lte\("kickoff_at",horizon\)/);assert.match(source,/publishedIds\.has/);assert.match(source,/predictedIds\.has/);assert.match(source,/maxEnrichmentFixturesPerRun/);assert.match(source,/maxEnrichmentRequestsPerRun/);assert.match(source,/getSnapshot/)});
test("public reads persisted snapshots and never imports provider code",async()=>{const source=await read("modules/football-experience/repository.ts");assert.match(source,/football_data_snapshots/);assert.doesNotMatch(source,/ApiFootballProvider|fetchFixtureData|FOOTBALL_API_KEY/)});
test("snapshot persistence remains duplicate-safe and unavailable is not synthesized",async()=>{const [repository,service]=await Promise.all([read("modules/persistence/football-repositories.ts"),read("modules/football-data/service.ts")]);assert.match(repository,/onConflict: "fixture_id,data_type,provider"/);assert.match(service,/if \(!snapshot\) return cached/);assert.doesNotMatch(service,/return 0/)});
