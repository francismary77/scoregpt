import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
if (process.argv.includes("--cleanup-audit")) {
  const [competitions, teams, fixtures, runs, shadows, reports, users] = await Promise.all([
    admin.from("competitions").select("id", { count: "exact", head: true }).eq("provider", "validation-only"),
    admin.from("teams").select("id", { count: "exact", head: true }).eq("provider", "validation-only"),
    admin.from("fixtures").select("id", { count: "exact", head: true }).eq("provider", "validation-only"),
    admin.from("football_shadow_runs").select("id", { count: "exact", head: true }).like("id", "dev-publication-validation-%"),
    admin.from("football_shadow_predictions").select("id", { count: "exact", head: true }).like("id", "dev-publication-validation-%"),
    admin.from("intelligence_reports").select("id", { count: "exact", head: true }).like("source_reference", "football_shadow_predictions:dev-publication-validation-%"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  for (const result of [competitions, teams, fixtures, runs, shadows, reports]) if (result.error) throw result.error;
  if (users.error) throw users.error;
  console.log(JSON.stringify({ projectRef, remaining: { competitions: competitions.count, teams: teams.count, fixtures: fixtures.count, shadowRuns: runs.count, shadowPredictions: shadows.count, reports: reports.count, users: users.data.users.filter((entry) => entry.email?.startsWith("dev-publication-validation-")).length } }));
  process.exit(0);
}
const token = `dev-publication-validation-${Date.now()}-${randomUUID().slice(0, 8)}`;
const email = `${token}@example.com`;
const password = `${randomUUID().replaceAll("-", "")}Aa1!`;
const made = { userId: null, competitionId: null, teamIds: [], fixtureIds: [], shadowIds: [], reportIds: [], runId: token };
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
  await remove("shadow run", admin.from("football_shadow_runs").delete().eq("id", made.runId), failures);
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

  const competition = await must(admin.from("competitions").insert({ provider: "validation-only", provider_id: token, name: "Disposable Publication Validation League", country: "Development", season: "validation-only", enabled: false, tier: "validation", is_demo: false }).select("id").single(), "competition");
  made.competitionId = competition.id;
  const teams = await must(admin.from("teams").insert(Array.from({ length: 8 }, (_, index) => ({ provider: "validation-only", provider_id: `${token}-team-${index + 1}`, competition_id: competition.id, name: `Disposable Validation Team ${index + 1}`, short_name: `DVT${index + 1}`, country: "Development", is_demo: false }))).select("id,name"), "teams");
  made.teamIds = teams.map((row) => row.id);
  const now = Date.now();
  const fixtures = await must(admin.from("fixtures").insert(Array.from({ length: 4 }, (_, index) => ({ provider: "validation-only", provider_fixture_id: `${token}-fixture-${index + 1}`, competition_id: competition.id, home_team_id: teams[index * 2].id, away_team_id: teams[index * 2 + 1].id, kickoff_at: new Date(now + (24 + index) * 3600_000).toISOString(), status: "scheduled", source: "disposable-development-validation", is_demo: false }))).select("id,provider_fixture_id,kickoff_at,home_team_id,away_team_id"), "fixtures");
  made.fixtureIds = fixtures.map((row) => row.id);
  await must(admin.from("football_shadow_runs").insert({ id: token, started_at: new Date(now - 7200_000).toISOString(), completed_at: new Date(now - 7100_000).toISOString(), mode: "SHADOW_PERSIST", source_type: "PERSISTED_DATABASE", operational_status: "COMPLETED", horizon_start: new Date(now).toISOString(), horizon_end: new Date(now + 48 * 3600_000).toISOString(), fixtures_found: 4, fixtures_eligible: 4, predictions_created: 4, predictions_persisted: 4, provider_requests: 0, methodology_version: "validation-v1", confidence_version: "validation-confidence-v1", policy_version: "validation-policy-v1" }), "shadow run");
  const probabilitySets = [[0.55, 0.25, 0.2], [0.33, 0.4, 0.27], [0.25, 0.3, 0.45], [0.55, 0.25, 0.2]];
  const outcomes = ["home", "draw", "away", "home"];
  const shadows = fixtures.map((fixture, index) => ({ id: `${token}-shadow-${index + 1}`, run_id: token, fixture_id: fixture.id, provider_fixture_id: fixture.provider_fixture_id, competition_id: competition.id, provider_competition_id: token, season: "validation-only", home_team_id: fixture.home_team_id, away_team_id: fixture.away_team_id, kickoff_at: fixture.kickoff_at, prediction_created_at: new Date(now - 3600_000).toISOString(), evidence_cutoff_at: new Date(now - 7200_000).toISOString(), selected_outcome: outcomes[index], home_probability: probabilitySets[index][0], draw_probability: probabilitySets[index][1], away_probability: probabilitySets[index][2], methodology_key: "historical-v1", methodology_version: "validation-v1", confidence_version: "validation-confidence-v1", confidence_score_internal: 0.62, confidence_label: "MODERATE", publishing_tier_calculated: "STANDARD_ANALYSIS", publishing_policy_version: "validation-policy-v1", ranking_scope: "DAILY_GLOBAL", ranking_date: new Date(now).toISOString().slice(0, 10), ranking_position: index + 1, eligible_population_size: 4, is_top_pick_calculated: false, operational_publication_state: "SHADOW_ONLY", shadow_mode: true, settlement_status: "PENDING", methodology_snapshot: { validationOnly: true, providerRequests: 0 } }));
  await must(admin.from("football_shadow_predictions").insert(shadows), "shadows");
  made.shadowIds = shadows.map((row) => row.id);

  const reportA = await must(admin.rpc("prepare_consumer_prediction", { p_forward_prediction_id: shadows[0].id, p_access_level: "registered" }), "prepare A");
  made.reportIds.push(reportA);
  const prepared = await must(admin.from("intelligence_reports").select("*,prediction_markets(*)").eq("id", reportA).single(), "prepared report");
  assert(prepared.status === "draft" && prepared.consumer_publication_state === "NOT_PUBLISHED", "prepared report leaked state");
  assert(prepared.forward_prediction_id === shadows[0].id && prepared.source_reference === `football_shadow_predictions:${shadows[0].id}`, "traceability mismatch");
  assert(prepared.prediction_markets.length === 1, "market cardinality mismatch");
  const repeatedPrepare = await must(admin.rpc("prepare_consumer_prediction", { p_forward_prediction_id: shadows[0].id, p_access_level: "registered" }), "repeat prepare");
  assert(repeatedPrepare === reportA, "prepare replay created another report");
  const reportRows = await must(admin.from("intelligence_reports").select("id").eq("forward_prediction_id", shadows[0].id), "report duplicate read");
  assert(reportRows.length === 1, "duplicate report exists");

  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportA, p_target_state: "READY_FOR_REVIEW" }), "A ready");
  assert(!(await must(anon.rpc("list_consumer_prediction_catalog"), "ready catalog")).some((row) => row.report_id === reportA), "READY report visible");
  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportA, p_target_state: "PUBLISHED" }), "A publish");
  const publishedCatalog = await must(anon.rpc("list_consumer_prediction_catalog"), "published catalog");
  const additions = publishedCatalog.filter((row) => !baseline.has(`${row.report_id}:${row.fixture_id}`));
  assert(additions.length === 1 && additions[0].report_id === reportA, "catalog publication delta mismatch");
  const lockedRead = await must(user.from("intelligence_reports").select("id").eq("id", reportA), "locked report read");
  assert(lockedRead.length === 0, "registered report readable before entitlement");
  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportA, p_target_state: "WITHDRAWN" }), "A withdraw");
  assert(!(await must(anon.rpc("list_consumer_prediction_catalog"), "withdrawn catalog")).some((row) => row.report_id === reportA), "withdrawn report visible");
  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportA, p_target_state: "READY_FOR_REVIEW" }), "A recovery");
  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportA, p_target_state: "READY_FOR_REVIEW" }), "same-state transition");

  const reportB = await must(admin.rpc("prepare_consumer_prediction", { p_forward_prediction_id: shadows[1].id, p_access_level: "registered" }), "prepare B");
  made.reportIds.push(reportB);
  expectError((await admin.rpc("transition_consumer_prediction", { p_report_id: reportB, p_target_state: "PUBLISHED" })).error, /invalid_publication_transition/, "invalid transition");
  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportA, p_target_state: "PUBLISHED" }), "A republish");
  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportB, p_target_state: "READY_FOR_REVIEW" }), "B ready");
  await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportB, p_target_state: "PUBLISHED" }), "B publish");
  for (let index = 2; index < 4; index += 1) {
    const reportId = await must(admin.rpc("prepare_consumer_prediction", { p_forward_prediction_id: shadows[index].id, p_access_level: "registered" }), `prepare ${index + 1}`);
    made.reportIds.push(reportId);
    await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportId, p_target_state: "READY_FOR_REVIEW" }), `ready ${index + 1}`);
    await must(admin.rpc("transition_consumer_prediction", { p_report_id: reportId, p_target_state: "PUBLISHED" }), `publish ${index + 1}`);
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

  const analysis = reportAfterUnlock.analysis;
  assert(analysis.kind === "frozen-forward-prediction-v1" && analysis.forwardPredictionId === shadows[0].id, "consumer stored analysis mismatch");
  assert(analysis.probabilities.home === 0.55 && analysis.probabilities.draw === 0.25 && analysis.probabilities.away === 0.2, "consumer probability mismatch");
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
  console.log(JSON.stringify({ success: true, projectRef, token, passwordBytes: new TextEncoder().encode(password).byteLength, checks, temporaryCreatedAndRemoved: { users: 1, profiles: 1, competitions: 1, teams: 8, fixtures: 4, shadowRuns: 1, shadowPredictions: 4, reports: 4, markets: 4, usageRows: 3 }, providerRequests: 0, historicalEvidenceMutations: 0, productionAccess: 0, productionWrites: 0, productionDeployments: 0 }, null, 2));
} catch (error) {
  const cleanupFailures = await cleanup();
  console.error(JSON.stringify({ success: false, projectRef, token, failure: error.message, cleanupFailures, created: { user: Boolean(made.userId), competition: Boolean(made.competitionId), teams: made.teamIds.length, fixtures: made.fixtureIds.length, shadows: made.shadowIds.length, reports: made.reportIds.length }, providerRequests: 0, historicalEvidenceMutations: 0, productionAccess: 0, productionWrites: 0, productionDeployments: 0 }, null, 2));
  process.exitCode = 1;
}
