import type { SupabaseClient } from "@supabase/supabase-js";
import type { Membership, MembershipStatus, MembershipTier, PredictionUsage } from "@/modules/account/domain";
import type { MembershipRepository, PredictionUsageRepository, ProfileRepository } from "@/modules/account/repositories";
import type { PlatformSetupOrder, PaymentStatus } from "@/modules/billing/domain";
import type { PlatformOrderRepository } from "@/modules/billing/repositories";
import type { Database, Json } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type SnapshotFreshness = "fresh" | "stale" | "missing";

export interface FootballCacheRepository {
  getSnapshot(fixtureId: string, dataType: string): Promise<{
    payload: Json;
    fetchedAt: string;
    expiresAt: string | null;
    provider: string;
    freshness: SnapshotFreshness;
  } | null>;
}

export interface StoredIntelligenceRepository {
  getPublishedReport(fixtureId: string): Promise<{
    id: string;
    fixtureId: string;
    recommendedMarket: string | null;
    confidence: number | null;
    riskLevel: string | null;
    reasoning: string | null;
    analysis: Json;
    generatedAt: string | null;
    sourceDataFetchedAt: string | null;
    accessLevel: "public" | "registered" | "premium";
  } | null>;
}

function throwOnError(error: { message: string } | null): void {
  if (error) throw new Error(`Supabase repository error: ${error.message}`);
}

export function getSnapshotFreshness(expiresAt: string | null, now = new Date()): SnapshotFreshness {
  if (!expiresAt) return "fresh";
  return new Date(expiresAt).getTime() > now.getTime() ? "fresh" : "stale";
}

export class SupabaseMembershipRepository implements MembershipRepository {
  constructor(private readonly client: Client) {}

  async getMembershipForUser(userId: string): Promise<Membership> {
    const { data, error } = await this.client
      .from("memberships")
      .select("user_id,plan,status,starts_at,expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwOnError(error);
    if (!data) return { userId, tier: "free", status: "none" };
    return {
      userId: data.user_id,
      tier: data.plan as MembershipTier,
      status: data.status as MembershipStatus,
      startedAt: data.starts_at ?? undefined,
      expiresAt: data.expires_at ?? undefined,
    };
  }

  async getTierForUser(userId: string): Promise<MembershipTier> {
    return (await this.getMembershipForUser(userId)).tier;
  }

  async getMembershipStatus(userId: string): Promise<MembershipStatus> {
    return (await this.getMembershipForUser(userId)).status;
  }
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: Client) {}
  async getProfile(userId: string) {
    const { data, error } = await this.client.from("profiles").select("user_id,display_name").eq("user_id", userId).maybeSingle();
    throwOnError(error);
    return data ? { userId: data.user_id, displayName: data.display_name ?? "Member", country: "Nigeria" } : null;
  }
  async updateDisplayName(userId: string, displayName: string) {
    const clean = displayName.trim();
    if (!clean) throw new Error("Display name is required.");
    const { data, error } = await this.client.from("profiles").update({ display_name: clean }).eq("user_id", userId).select("user_id,display_name").single();
    throwOnError(error);
    if (!data) throw new Error("Supabase repository error: profile was not returned.");
    return { userId: data.user_id, displayName: data.display_name ?? clean, country: "Nigeria" };
  }
}

export class SupabasePredictionUsageRepository implements PredictionUsageRepository {
  constructor(private readonly client: Client) {}

  async getUsageForUser(userId: string): Promise<PredictionUsage> {
    const { data, error } = await this.client
      .from("prediction_usage")
      .select("fixture_id,created_at")
      .eq("user_id", userId)
      .in("usage_type", ["report-view", "report-unlock"])
      .order("created_at", { ascending: false });
    throwOnError(error);
    const ids = [...new Set((data ?? []).flatMap((row) => row.fixture_id ? [row.fixture_id] : []))];
    const fixtures = ids.length ? await this.client.from("fixtures").select("id,provider_fixture_id").in("id", ids) : { data: [], error: null };
    throwOnError(fixtures.error);
    const labels = new Map((fixtures.data ?? []).map((fixture) => [fixture.id, fixture.provider_fixture_id ?? fixture.id]));
    const viewedFixtureIds = ids.map((id) => labels.get(id) ?? id);
    return {
      userId,
      viewedFixtureIds,
      used: ids.length,
      updatedAt: data?.[0]?.created_at ?? new Date(0).toISOString(),
    };
  }

  async getRemainingAllowance(userId: string, allowance: number): Promise<number> {
    return Math.max(0, allowance - (await this.getUsageForUser(userId)).used);
  }

  async recordPredictionView(userId: string, fixtureId: string): Promise<PredictionUsage> {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let persistedFixtureId = fixtureId;
    if (!uuidPattern.test(fixtureId)) {
      const { data, error } = await this.client.from("fixtures").select("id").eq("provider_fixture_id", fixtureId).maybeSingle();
      throwOnError(error);
      if (!data) throw new Error("This fixture is not available in persisted intelligence yet.");
      persistedFixtureId = data.id;
    }
    const { data: existing, error: readError } = await this.client.from("prediction_usage").select("id").eq("user_id", userId).eq("fixture_id", persistedFixtureId).eq("usage_type", "report-view").maybeSingle();
    throwOnError(readError);
    if (!existing) {
      const { error } = await this.client.from("prediction_usage").insert({
        user_id: userId,
        fixture_id: persistedFixtureId,
        usage_type: "report-view",
      });
      throwOnError(error);
    }
    return this.getUsageForUser(userId);
  }

  async unlockPrediction(_userId: string, fixtureId: string, allowance: number) {
    const persistedFixtureId = await this.resolveFixtureId(fixtureId);
    const { data, error } = await this.client.rpc("unlock_consumer_prediction", { p_fixture_id: persistedFixtureId, p_allowance: allowance });
    throwOnError(error);
    const result = data?.[0];
    if (!result) throw new Error("Prediction unlock did not return a result.");
    return { reportId: result.report_id, alreadyUnlocked: result.already_unlocked, remaining: result.remaining };
  }

  private async resolveFixtureId(fixtureId: string): Promise<string> {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(fixtureId)) return fixtureId;
    const { data, error } = await this.client.from("fixtures").select("id").eq("provider_fixture_id", fixtureId).maybeSingle();
    throwOnError(error);
    if (!data) throw new Error("This fixture is not available in persisted intelligence yet.");
    return data.id;
  }
}

export class SupabaseFootballCacheRepository implements FootballCacheRepository {
  constructor(private readonly client: Client) {}

  async getSnapshot(fixtureId: string, dataType: string) {
    const { data, error } = await this.client
      .from("football_data_snapshots")
      .select("payload,fetched_at,expires_at,provider")
      .eq("fixture_id", fixtureId)
      .eq("data_type", dataType)
      .maybeSingle();
    throwOnError(error);
    if (!data) return null;
    return {
      payload: data.payload,
      fetchedAt: data.fetched_at,
      expiresAt: data.expires_at,
      provider: data.provider,
      freshness: getSnapshotFreshness(data.expires_at),
    };
  }
}

export class SupabaseStoredIntelligenceRepository implements StoredIntelligenceRepository {
  constructor(private readonly client: Client) {}

  async getPublishedReport(fixtureId: string) {
    const { data, error } = await this.client
      .from("intelligence_reports")
      .select("id,fixture_id,recommended_market,confidence,risk_level,reasoning,analysis,generated_at,source_data_fetched_at,access_level")
      .eq("fixture_id", fixtureId)
      .eq("status", "published")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwOnError(error);
    if (!data) return null;
    return {
      id: data.id,
      fixtureId: data.fixture_id,
      recommendedMarket: data.recommended_market,
      confidence: data.confidence,
      riskLevel: data.risk_level,
      reasoning: data.reasoning,
      analysis: data.analysis,
      generatedAt: data.generated_at,
      sourceDataFetchedAt: data.source_data_fetched_at,
      accessLevel: data.access_level,
    };
  }
}

export class SupabasePlatformOrderRepository implements PlatformOrderRepository {
  constructor(private readonly client: Client) {}

  private map(row: Database["public"]["Tables"]["orders"]["Row"]): PlatformSetupOrder {
    return {
      id: row.id,
      packageId: row.package_id,
      packageName: row.package_name,
      customer: {
        name: row.buyer_name,
        email: row.buyer_email,
        phone: row.buyer_phone ?? undefined,
        brandName: row.brand_name ?? undefined,
      },
      total: { amount: row.amount_minor / 100, currency: row.currency },
      status: row.status as PaymentStatus,
      paymentProviderId: row.payment_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getOrders(): Promise<PlatformSetupOrder[]> {
    const { data, error } = await this.client.from("orders").select("*").order("created_at", { ascending: false });
    throwOnError(error);
    return (data ?? []).map((row) => this.map(row));
  }

  async getOrder(id: string): Promise<PlatformSetupOrder | null> {
    const { data, error } = await this.client.from("orders").select("*").eq("id", id).maybeSingle();
    throwOnError(error);
    return data ? this.map(data) : null;
  }

  async getOrdersByStatus(status: PaymentStatus): Promise<PlatformSetupOrder[]> {
    const { data, error } = await this.client.from("orders").select("*").eq("status", status).order("created_at", { ascending: false });
    throwOnError(error);
    return (data ?? []).map((row) => this.map(row));
  }

  async saveOrder(order: PlatformSetupOrder): Promise<PlatformSetupOrder> {
    const { data, error } = await this.client.from("orders").upsert({
      id: order.id,
      order_number: order.id,
      buyer_name: order.customer.name,
      buyer_email: order.customer.email,
      buyer_phone: order.customer.phone ?? null,
      brand_name: order.customer.brandName ?? null,
      package_id: order.packageId,
      package_name: order.packageName,
      amount_minor: Math.round(order.total.amount * 100),
      currency: order.total.currency,
      payment_method: order.paymentProviderId,
      status: order.status,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    }).select("*").single();
    throwOnError(error);
    if (!data) throw new Error("Supabase repository error: order was not returned.");
    return this.map(data);
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<PlatformSetupOrder | null> {
    const { data, error } = await this.client.from("orders").update({ status }).eq("id", id).select("*").maybeSingle();
    throwOnError(error);
    return data ? this.map(data) : null;
  }
}
