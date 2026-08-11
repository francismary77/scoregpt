import type { ShadowPredictionRecord, ShadowPredictionRepository, ShadowRunRecord, ShadowRunRepository } from "./domain";

const clone = <T>(value: T): T => structuredClone(value);
export class MemoryShadowPredictionRepository implements ShadowPredictionRepository {
  private readonly rows = new Map<string, ShadowPredictionRecord>();
  private key(row: Pick<ShadowPredictionRecord, "fixtureId" | "methodologyVersion" | "publishingPolicyVersion" | "shadowMode">) { return `${row.fixtureId}|${row.methodologyVersion}|${row.publishingPolicyVersion}|${row.shadowMode}`; }
  async findByIdentity(identity: Pick<ShadowPredictionRecord, "fixtureId" | "methodologyVersion" | "publishingPolicyVersion" | "shadowMode">) { const row = this.rows.get(this.key(identity)); return row ? clone(row) : null; }
  async insert(record: ShadowPredictionRecord) { const key = this.key(record), existing = this.rows.get(key); if (existing) return { record: clone(existing), created: false }; this.rows.set(key, clone(record)); return { record: clone(record), created: true }; }
  async list() { return [...this.rows.values()].map(clone); }
  async updateSettlement(id: string, expectedUpdatedAt: string, settlement: Pick<ShadowPredictionRecord, "settlementStatus" | "actualHomeGoals" | "actualAwayGoals" | "actualOutcome" | "predictionCorrect" | "settledAt">) { const entry = [...this.rows.entries()].find(([, row]) => row.id === id); if (!entry) throw new Error("Shadow prediction was not found."); if (entry[1].updatedAt !== expectedUpdatedAt) throw new Error("Shadow prediction changed concurrently."); const updated = { ...entry[1], ...settlement, updatedAt: settlement.settledAt ?? entry[1].updatedAt }; this.rows.set(entry[0], updated); return clone(updated); }
}
export class MemoryShadowRunRepository implements ShadowRunRepository { private rows: ShadowRunRecord[] = []; async insert(record: ShadowRunRecord) { this.rows.push(clone(record)); } async list() { return this.rows.map(clone); } }
