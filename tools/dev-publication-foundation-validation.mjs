import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadPersistedShadowFixtureSources } from "../modules/persistence/shadow-fixture-source.ts";
import { SupabaseShadowPredictionRepository, SupabaseShadowRunRepository } from "../modules/persistence/shadow-repositories.ts";
import { runShadowPredictionPipeline } from "../modules/football-intelligence/shadow-pipeline/index.ts";
import { ConsumerPredictionPublicationService } from "../modules/consumer-publication/service.ts";

const expectedProject = "oislplqdvtaajqxbwvut";
const env = Object.fromEntries((await readFile(".env.local", "utf8")).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : [];
}));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !publicKey) throw new Error("Development credentials unavailable");
const projectRef = new URL(url).hostname.split(".")[0];
if (projectRef !== expectedProject) throw new Error(`Development identity gate failed: ${projectRef}`);
if (process.argv.includes("--static-check")) {
  console.log(JSON.stringify({ staticCheck: "passed", projectRef, providerCallsEnabled: false }));
  process.exit(0);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
const publication = new ConsumerPredictionPublicationService(admin);
const cleanupAuditArg = process.argv.find((argument) => argument.startsWith("--cleanup-audit="));
if (cleanupAuditArg) {
  const marker = cleanupAuditArg.slice("--cleanup-audit=".length), timestamp = Number(marker.split("-")[3]);
  if (!/^dev-publication-validation-\d+-[a-z0-9]+$/.test(marker) || !Number.isFinite(timestamp)) throw new Error("A valid exact cleanup marker is required.");
  const shadowRunId = (offset) => `shadowrun_${new Date(timestamp + offset).toISOString().replace(/[^a-zA-Z0-9]/g, "").slice(-32)}`;
  const [competitions, teams, memberships, fixtures, runs, shadows, reports, markets, usage, profiles, users] = await Promise.all([
    admin.from("competitions").select("id", { count: "exact", head: true }).eq("provider_id", marker),
    admin.from("teams").select("id", { count: "exact", head: true }).like("provider_id", `${marker}-team-%`),
    admin.from("team_competition_seasons").select("team_id,teams!inner(provider_id)", { count: "exact", head: true }).like("teams.provider_id", `${marker}-team-%`),
    admin.from("fixtures").select("id", { count: "exact", head: true }).like("provider_fixture_id", `${marker}-%`),
    admin.from("football_shadow_runs").select("id", { count: "exact", head: true }).in("id", [shadowRunId(0), shadowRunId(1_000), shadowRunId(2_000)]),
    admin.from("football_shadow_predictions").select("id", { count: "exact", head: true }).eq("provider_competition_id", marker),
    admin.from("intelligence_reports").select("id", { count: "exact", head: true }).like("source_reference", `%${marker}%`),
    admin.from("prediction_markets").select("id,intelligence_reports!inner(source_reference)", { count: "exact", head: true }).like("intelligence_reports.source_reference", `%${marker}%`),
    admin.from("prediction_usage").select("id,intelligence_reports!inner(source_reference)", { count: "exact", head: true }).like("intelligence_reports.source_reference", `%${marker}%`),
    admin.from("profiles").select("user_id", { count: "exact", head: true }).eq("email", `${marker}@example.com`),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  for (const result of [competitions, teams, memberships, fixtures, runs, shadows, reports, markets, usage, profiles]) if (result.error) throw result.error;
  if (users.error) throw users.error;
  console.log(JSON.stringify({ projectRef, marker, remaining: { authUsers: users.data.users.filter((entry) => entry.email === `${marker}@example.com`).length, profiles: profiles.count, competitions: competitions.count, teams: teams.count, memberships: memberships.count, fixtures: fixtures.count, shadowRuns: runs.count, shadowPredictions: shadows.count, intelligenceReports: reports.count, predictionMarkets: markets.count, predictionUsage: usage.count } }));
  process.exit(0);
}
const token = `dev-publication-validation-${Date.now()}-${randomUUID().slice(0, 8)}`;
const email = `${token}@example.com`;
const password = `${randomUUID().replaceAll("-", "")}Aa1!`;
const made = { userId: null, competitionId: null, teamIds: [], fixtureIds: [], shadowIds: [], reportIds: [], runIds: [] };
const checks = {};

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const safeError = (error) => `${error?.code ?? ""} ${error?.message ?? ""}`;
const expectError = (error, pattern, label) => assert(error && pattern.test(safeError(error)), `${label}: ${safeError(error) || "no error"}`);
async function must(promise, label) { const result = await promise; if (result.error) throw new Error(`${label}: ${safeError(result.error)}`); return result.data; }
async function remove(label, promise, failures) { const { error } = await promise; if (error) failures.push(`${label}: ${safeError(error)}`); }
async function cleanup() {
  const failures = [];
  if (made.userId) await remove("usage", admin.from("prediction_usage").delete().eq("user_id", made.userId), failures);
  if (made.reportIds.length) await remove("markets", admin.from("prediction_markets").delete().in("intelligence_report_id", made.reportIds), failures);
  if (made.reportIds.length) await remove("reports", admin.from("intelligence_reports").delete().in("id", made.reportIds), failures);
  if (made.shadowIds.length) await remove("shadows", admin.from("football_shadow_predictions").delete().in("id", made.shadowIds), failures);
  if (made.runIds.length) await remove("shadow runs", admin.from("football_shadow_runs").delete().in("id", made.runIds), failures);
  if (made.fixtureIds.length) await remove("fixtures", admin.from("fixtures").delete().in("id", made.fixtureIds), failures);
  if (made.teamIds.length && made.competitionId) await remove("memberships", admin.from("team_competition_seasons").delete().eq("competition_id", made.competitionId).in("team_id", made.teamIds), failures);
  if (made.teamIds.length) await remove("teams", admin.from("teams").delete().in("id", made.teamIds), failures);
  if (made.competitionId) await remove("competition", admin.from("competitions").delete().eq("id", made.competitionId), failures);
  if (made.userId) { const result = await admin.auth.admin.deleteUser(made.userId); if (result.error) failures.push(`user: ${result.error.message}`); }
  return failures;
}

try {
  // Reconfirm RPC objects before any disposable mutation.
  expectError((await admin.rpc("prepare_consumer_prediction", { p_forward_prediction_id: `${token}-absent`, p_access_level: "registered" })).error, /P0002|shadow_prediction_not_found/, "prepare RPC");
  expectError((await admin.rpc("transition_consumer_prediction", { p_report_id: randomUUID(), p_target_state: "READY_FOR_REVIEW" })).error, /P0002|consumer_report_not_found/, "transition RPC");
  expectError((await anon.rpc("unlock_consumer_prediction", { p_fixture_id: randomUUID() })).error, /42501|authentication_required|permission denied/i, "anonymous unlock");
  expectError((await anon.rpc("unlock_consumer_prediction", { p_fixture_id: randomUUID(), p_allowance: 99 })).error, /PGRST202|schema cache|could not find/i, "caller allowance signature");
  checks.schema = "passed";

  const baselineCatalog = await must(anon.rpc("list_consumer_prediction_catalog"), "baseline catalog");
  const baseline = new Set((baselineCatalog ?? []).map((row) => `${row.report_id}:${row.fixture_id}`));

  // One confirmed disposable Development user; admin creation sends no email.
  const createdUser = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Disposable publication validation" } });
  if (createdUser.error || !createdUser.data.user) throw new Error(`create disposable user: ${createdUser.error?.message ?? "missing user"}`);
  made.userId = createdUser.data.user.id;
  const profile = await must(admin.from("profiles").select("user_id,display_name,email,role,account_status").eq("user_id", made.userId).single(), "profile trigger readback");
  assert(profile.user_id === made.userId && profile.display_name === "Disposable publication validation" && profile.role === "user" && profile.account_status === "active", "profile trigger output mismatch");
  const user = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await user.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error(`disposable login: ${login.error.message}`);
  checks.authUser = { created: true, profileCreated: true, authenticated: true };

  expectError((await user.rpc("prepare_consumer_prediction", { p_forward_prediction_id: `${token}-absent`, p_access_level: "registered" })).error, /42501|permission denied|publication_privilege_required/i, "ordinary prepare");
  expectError((await user.rpc("transition_consumer_prediction", { p_report_id: randomUUID(), p_target_state: "READY_FOR_REVIEW" })).error, /42501|permission denied|publication_privilege_required/i, "ordinary transition");
  expectError((await user.from("prediction_usage").insert({ user_id: made.userId, fixture_id: randomUUID(), usage_type: "report-unlock" })).error, /42501|permission denied|row-level security/i, "direct usage insert");

  const competitionName = `DEV_E2E_PUBLICATION_${token}`;
  const competition = await must(admin.from("competitions").insert({ provider: "validation-only", provider_id: token, name: competitionName, country: "Development", season: "validation-only", enabled: true, tier: "validation", is_demo: false }).select("id").single(), "competition");
  made.competitionId = competition.id;
  const teams = await must(admin.from("teams").insert(Array.from({ length: 8 }, (_, index) => ({ provider: "validation-only", provider_id: `${token}-team-${index + 1}`, competition_id: competition.id, name: `Disposable Validation Team ${index + 1}`, short_name: `DVT${index + 1}`, country: "Development", is_demo: false }))).select("id,name"), "teams");
  made.teamIds = teams.map((row) => row.id);
  await must(admin.from("team_competition_seasons").insert(teams.map((team) => ({ team_id: team.id, competition_id: competition.id }))), "memberships");
  const now = Date.now();
  const historicalRows = [];
  let historicalIndex = 0;
  for (let home = 0; home < teams.length; home += 1) for (let away = home + 1; away < teams.length; away += 1) {
    historicalIndex += 1;
    historicalRows.push({ provider: "validation-only", provider_fixture_id: `${token}-history-${historicalIndex}`, competition_id: competition.id, home_team_id: teams[home].id, away_team_id: teams[away].id, kickoff_at: new Date(now - (60 - historicalIndex) * 86_400_000).toISOString(), status: "finished", home_score: (home + away) % 4, away_score: (home * 2 + away) % 3, source: "disposable-development-validation", is_demo: false });
  }
  const historicalFixtures = await must(admin.from("fixtures").insert(historicalRows).select("id"), "historical fixtures");
  const fixtures = await must(admin.from("fixtures").insert(Array.from({ length: 4 }, (_, index) => ({ provider: "validation-only", provider_fixture_id: `${token}-fixture-${index + 1}`, competition_id: competition.id, home_team_id: teams[index * 2].id, away_team_id: teams[index * 2 + 1].id, kickoff_at: new Date(now + (24 + index) * 3600_000).toISOString(), status: "scheduled", source: "disposable-development-validation", is_demo: false }))).select("id,provider_fixture_id,kickoff_at,home_team_id,away_team_id"), "upcoming fixtures");
  made.fixtureIds = [...historicalFixtures.map((row) => row.id), ...fixtures.map((row) => row.id)];
  const supported = { internalCompetitionId: competition.id, providerCompetitionId: token, name: competitionName, providerName: competitionName, country: "Development", season: "validation-only", enabled: true };
  const controls = { enabled: true, providerCallsEnabled: false, publicPublishingEnabled: false, globallyPaused: false, horizonHours: 48, maxProviderRequestsPerRun: 0, maxFixtureRefreshAgeMinutes: 180 };
  const repositories = { predictions: new SupabaseShadowPredictionRepository(admin), runs: new SupabaseShadowRunRepository(admin) };
  const sources = await loadPersistedShadowFixtureSources(admin, [supported], new Date(now).toISOString(), 48);
  assert(sources.length === 1 && sources[0].dataset.fixtures.length === 28 && sources[0].upcomingFixtures.length === 4, "persisted historical source mismatch");
  const firstSource = { ...sources[0], upcomingFixtures: sources[0].upcomingFixtures.slice(0, 1) };
  const firstRun = await runShadowPredictionPipeline([firstSource], repositories, controls, [supported], { now: new Date(now).toISOString(), dryRun: false, persist: true, providerRefresh: false, horizonHours: 48, minimumLeadMinutes: 120 });
  made.runIds.push(firstRun.runId);
  assert(firstRun.predictionsCreated === 1 && firstRun.records.length === 1 && firstRun.providerRequests === 0, "first genuine shadow run mismatch");
  const replayRun = await runShadowPredictionPipeline([firstSource], repositories, controls, [supported], { now: new Date(now + 1_000).toISOString(), dryRun: false, persist: true, providerRefresh: false, horizonHours: 48, minimumLeadMinutes: 120 });
  made.runIds.push(replayRun.runId);
  assert(replayRun.predictionsCreated === 0 && replayRun.predictionsReused === 1 && replayRun.records[0].id === firstRun.records[0].id, "shadow idempotency mismatch");
  const remainingSource = { ...sources[0], upcomingFixtures: sources[0].upcomingFixtures.slice(1) };
  const remainingRun = await runShadowPredictionPipeline([remainingSource], repositories, controls, [supported], { now: new Date(now + 2_000).toISOString(), dryRun: false, persist: true, providerRefresh: false, horizonHours: 48, minimumLeadMinutes: 120 });
  made.runIds.push(remainingRun.runId);
  assert(remainingRun.predictionsCreated === 3 && remainingRun.records.length === 3 && remainingRun.providerRequests === 0, "additional genuine shadow run mismatch");
  const shadows = [...firstRun.records, ...remainingRun.records];
  made.shadowIds = shadows.map((row) => row.id);
  assert(shadows.every((row) => row.methodologyKey === "historical-v1" && row.shadowMode && row.operationalPublicationState === "SHADOW_ONLY" && row.settlementStatus === "PENDING" && row.evidenceCutoffAt < row.predictionCreatedAt && row.predictionCreatedAt < row.kickoffAt), "genuine shadow prerequisite mismatch");
  checks.shadow = { generatedByHistoricalV1: true, initialPredictionCount: 1, additionalAllowanceFixtures: 3, replayCreated: replayRun.predictionsCreated, replayReused: replayRun.predictionsReused, providerRequests: 0 };

  async function verifyPreparedReport(reportId, index) {
    const report = await must(admin.from("intelligence_reports").select("*,prediction_markets(*)").eq("id", reportId).single(), `prepared report ${index + 1}`);
    const shadow = shadows[index], fixture = fixtures[index];
    const homeTeam = teams.find((team) => team.id === fixture.home_team_id), awayTeam = teams.find((team) => team.id === fixture.away_team_id);
    assert(homeTeam && awayTeam, "canonical team lookup failed");
    const expectedMarketPrediction = shadow.selectedOutcome === "home" ? homeTeam.name : shadow.selectedOutcome === "away" ? awayTeam.name : "Draw";
    const expectedProbability = shadow.selectedOutcome === "home" ? shadow.homeProbability : shadow.selectedOutcome === "away" ? shadow.awayProbability : shadow.drawProbability;
    assert(report.status === "draft" && report.consumer_publication_state === "NOT_PUBLISHED", "prepared report leaked state");
    assert(report.forward_prediction_id === shadow.id && report.source_reference === `football_shadow_predictions:${shadow.id}`, "traceability mismatch");
    assert(report.prediction_markets.length === 1, "market cardinality mismatch");
    assert(report.analysis.kind === "frozen-forward-prediction-v1" && report.analysis.forwardPredictionId === shadow.id, "prepared frozen analysis mismatch");
    assert(report.analysis.selectedOutcome === shadow.selectedOutcome, "raw selected outcome was not preserved");
    assert(report.analysis.probabilities.home === shadow.homeProbability && report.analysis.probabilities.draw === shadow.drawProbability && report.analysis.probabilities.away === shadow.awayProbability, "prepared probabilities differ from frozen prediction");
    assert(report.analysis.methodology.version === shadow.methodologyVersion && report.analysis.evidence.cutoffAt === shadow.evidenceCutoffAt, "prepared provenance mismatch");
    assert(report.prediction_markets[0].market_type === "Match Winner" && report.prediction_markets[0].prediction === expectedMarketPrediction, "prepared market mapping mismatch");
    assert(Math.abs(report.prediction_markets[0].confidence / 100 - expectedProbability) < 0.000_001, "selected probability mapping mismatch");
    assert(!/press|possession|tactical|expected match flow/i.test(`${report.reasoning ?? ""} ${report.summary ?? ""}`), "publication layer invented tactical prose");
    return report;
  }

  const reportA = await publication.prepare(shadows[0].id, "registered");
  made.reportIds.push(reportA);
  await verifyPreparedReport(reportA, 0);
  const repeatedPrepare = await publication.prepare(shadows[0].id, "registered");
  assert(repeatedPrepare === reportA, "prepare replay created another report");
  const reportRows = await must(admin.from("intelligence_reports").select("id").eq("forward_prediction_id", shadows[0].id), "report duplicate read");
  assert(reportRows.length === 1, "duplicate report exists");

  await publication.markReadyForReview(reportA);
  assert(!(await must(anon.rpc("list_consumer_prediction_catalog"), "ready catalog")).some((row) => row.report_id === reportA), "READY report visible");
  await publication.publish(reportA);
  const publishedCatalog = await must(anon.rpc("list_consumer_prediction_catalog"), "published catalog");
  const additions = publishedCatalog.filter((row) => !baseline.has(`${row.report_id}:${row.fixture_id}`));
  assert(additions.length === 1 && additions[0].report_id === reportA, "catalog publication delta mismatch");
  const lockedRead = await must(user.from("intelligence_reports").select("id").eq("id", reportA), "locked report read");
  assert(lockedRead.length === 0, "registered report readable before entitlement");
  await publication.withdraw(reportA);
  assert(!(await must(anon.rpc("list_consumer_prediction_catalog"), "withdrawn catalog")).some((row) => row.report_id === reportA), "withdrawn report visible");
  await publication.markReadyForReview(reportA);
  await publication.markReadyForReview(reportA);

  const reportB = await publication.prepare(shadows[1].id, "registered");
  made.reportIds.push(reportB);
  await verifyPreparedReport(reportB, 1);
  expectError((await admin.rpc("transition_consumer_prediction", { p_report_id: reportB, p_target_state: "PUBLISHED" })).error, /invalid_publication_transition/, "invalid transition");
  await publication.publish(reportA);
  await publication.markReadyForReview(reportB);
  await publication.publish(reportB);
  for (let index = 2; index < 4; index += 1) {
    const reportId = await publication.prepare(shadows[index].id, "registered");
    made.reportIds.push(reportId);
    await verifyPreparedReport(reportId, index);
    await publication.markReadyForReview(reportId);
    await publication.publish(reportId);
  }
  checks.publication = { prepare: true, lifecycle: true, withdrawal: true, invalidTransitionRejected: true, replaySafe: true };

  const initialUsage = await must(user.from("prediction_usage").select("fixture_id").eq("user_id", made.userId), "initial usage");
  assert(initialUsage.length === 0, "initial allowance usage not zero");
  async function unlock(index) { const result = await user.rpc("unlock_consumer_prediction", { p_fixture_id: fixtures[index].id }); return result.error ? { error: result.error } : { row: result.data[0] }; }
  const a1 = await unlock(0); assert(a1.row.remaining === 2 && !a1.row.already_unlocked, "A first unlock");
  const a2 = await unlock(0); assert(a2.row.remaining === 2 && a2.row.already_unlocked, "A replay unlock");
  let usage = await must(user.from("prediction_usage").select("fixture_id,report_id").eq("user_id", made.userId), "usage after A");
  assert(usage.length === 1 && usage[0].fixture_id === fixtures[0].id, "canonical UUID entitlement mismatch");
  const reportAfterUnlock = await must(user.from("intelligence_reports").select("id,fixture_id,analysis,reasoning,prediction_markets(*)").eq("id", reportA).single(), "entitled report");
  assert(reportAfterUnlock.fixture_id === fixtures[0].id, "fixture authorization mismatch");
  await user.auth.signOut();
  const relogin = await user.auth.signInWithPassword({ email, password }); if (relogin.error) throw new Error(`relogin: ${relogin.error.message}`);
  const a3 = await unlock(0); assert(a3.row.remaining === 2 && a3.row.already_unlocked, "logout/login replay");
  const b1 = await unlock(1); assert(b1.row.remaining === 1 && !b1.row.already_unlocked, "B unlock");
  const b2 = await unlock(1); assert(b2.row.remaining === 1 && b2.row.already_unlocked, "B replay");
  const c1 = await unlock(2); assert(c1.row.remaining === 0 && !c1.row.already_unlocked, "C unlock");
  const c2 = await unlock(2); assert(c2.row.remaining === 0 && c2.row.already_unlocked, "C replay");
  const d1 = await unlock(3); expectError(d1.error, /allowance_exhausted/, "D exhausted");
  usage = await must(user.from("prediction_usage").select("fixture_id,report_id").eq("user_id", made.userId), "final usage");
  assert(usage.length === 3 && new Set(usage.map((row) => row.fixture_id)).size === 3, "usage count changed unexpectedly");
  assert((await must(user.from("intelligence_reports").select("id").eq("id", reportA), "zero allowance prior entitlement")).length === 1, "prior entitlement lost at zero");
  expectError((await user.rpc("unlock_consumer_prediction", { p_fixture_id: fixtures[3].id, p_allowance: 100 })).error, /PGRST202|schema cache|could not find/i, "allowance bypass");
  assert((await must(user.from("prediction_usage").select("fixture_id").eq("user_id", made.userId), "read-only revisit")).length === 3, "read navigation consumed allowance");
  checks.entitlement = { allowance: [3, 2, 1, 0], fourthDenied: true, replayFree: true, reloginPersistent: true, uuidCanonical: true, callerBypassDenied: true };

  const frozenBeforeWithdrawal = await must(admin.from("football_shadow_predictions").select("id,selected_outcome,home_probability,draw_probability,away_probability,prediction_created_at,evidence_cutoff_at").eq("id", shadows[0].id).single(), "frozen before entitled withdrawal");
  await publication.withdraw(reportA);
  assert(!(await must(anon.rpc("list_consumer_prediction_catalog"), "entitled withdrawn catalog")).some((row) => row.report_id === reportA), "entitled withdrawn report remained visible");
  assert((await must(user.from("prediction_usage").select("fixture_id").eq("user_id", made.userId), "usage through withdrawal")).length === 3, "withdrawal deleted entitlement history");
  const frozenAfterWithdrawal = await must(admin.from("football_shadow_predictions").select("id,selected_outcome,home_probability,draw_probability,away_probability,prediction_created_at,evidence_cutoff_at").eq("id", shadows[0].id).single(), "frozen after entitled withdrawal");
  assert(JSON.stringify(frozenAfterWithdrawal) === JSON.stringify(frozenBeforeWithdrawal), "withdrawal mutated frozen prediction");
  await publication.markReadyForReview(reportA);
  await publication.publish(reportA);
  assert((await must(anon.rpc("list_consumer_prediction_catalog"), "entitled republished catalog")).some((row) => row.report_id === reportA), "republished entitled report absent");
  const afterRepublish = await unlock(0);
  assert(afterRepublish.row.remaining === 0 && afterRepublish.row.already_unlocked, "republished entitlement charged again");
  assert((await must(user.from("prediction_usage").select("fixture_id").eq("user_id", made.userId), "usage after republication")).length === 3, "republication duplicated entitlement");
  checks.publication.entitlementSurvivesWithdrawal = true;
  checks.publication.republicationCharge = 0;

  const analysis = reportAfterUnlock.analysis;
  assert(analysis.kind === "frozen-forward-prediction-v1" && analysis.forwardPredictionId === shadows[0].id, "consumer stored analysis mismatch");
  assert(analysis.probabilities.home === shadows[0].homeProbability && analysis.probabilities.draw === shadows[0].drawProbability && analysis.probabilities.away === shadows[0].awayProbability, "consumer probability mismatch");
  assert(reportAfterUnlock.prediction_markets.length === 1 && reportAfterUnlock.prediction_markets[0].market_type === "Match Winner", "consumer market mismatch");
  const component = await readFile("components/stored-intelligence-report.tsx", "utf8");
  const genuineBranch = component.split(' : <>\n      <h4>Why this prediction?</h4>')[0];
  for (const heading of ["Team comparison", "Tactical outlook", "Expected match flow", "Confidence explanation", "Risk explanation", "Markets to avoid"]) assert(!genuineBranch.includes(heading), `generic section present in genuine branch: ${heading}`);
  assert(/!report\.forwardPrediction\s*&&[\s\S]*Markets to avoid/.test(component), "markets-to-avoid is not restricted to non-forward reports");
  assert(/responsib|probabilistic|not a guarantee/i.test(component), "transparency statement absent");
  checks.presentation = { storedModelFields: true, genericProseOmitted: true, transparencyPresent: true };

  const cleanupFailures = await cleanup();
  assert(cleanupFailures.length === 0, `cleanup failed: ${cleanupFailures.join(" | ")}`);
  assert((await must(admin.from("fixtures").select("id").in("id", made.fixtureIds), "cleanup fixtures")).length === 0, "fixtures remain after cleanup");
  assert((await must(admin.from("intelligence_reports").select("id").in("id", made.reportIds), "cleanup reports")).length === 0, "reports remain after cleanup");
  assert((await must(admin.from("teams").select("id").in("id", made.teamIds), "cleanup teams")).length === 0, "teams remain after cleanup");
  assert((await admin.auth.admin.getUserById(made.userId)).error, "auth user remains after cleanup");
  checks.cleanup = "passed";
  console.log(JSON.stringify({ success: true, projectRef, token, passwordBytes: new TextEncoder().encode(password).byteLength, checks, temporaryCreatedAndRemoved: { users: 1, profiles: 1, competitions: 1, teams: 8, memberships: 8, historicalFixtures: 28, upcomingFixtures: 4, shadowRuns: 3, shadowPredictions: 4, reports: 4, markets: 4, usageRows: 3 }, providerRequests: 0, historicalEvidenceMutations: 0, productionAccess: 0, productionWrites: 0, productionDeployments: 0 }, null, 2));
} catch (error) {
  const cleanupFailures = await cleanup();
  console.error(JSON.stringify({ success: false, projectRef, token, failure: error.message, cleanupFailures, created: { user: Boolean(made.userId), competition: Boolean(made.competitionId), teams: made.teamIds.length, fixtures: made.fixtureIds.length, shadows: made.shadowIds.length, reports: made.reportIds.length }, providerRequests: 0, historicalEvidenceMutations: 0, productionAccess: 0, productionWrites: 0, productionDeployments: 0 }, null, 2));
  process.exitCode = 1;
}
