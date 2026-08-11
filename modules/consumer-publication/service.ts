import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentAccessLevel } from "@/modules/account/domain";
import type { Database } from "@/lib/supabase/database.types";

export type ConsumerPublicationState = "NOT_PUBLISHED" | "READY_FOR_REVIEW" | "PUBLISHED" | "WITHDRAWN";

function failure(error: { message: string } | null, operation: string): never {
  throw new Error(error ? `${operation} failed: ${error.message}` : `${operation} returned no result.`);
}

/**
 * Privileged server-only bridge. The supplied client must carry the Supabase
 * service-role credential; the database functions independently enforce that
 * role and own all validation/transaction boundaries.
 */
export class ConsumerPredictionPublicationService {
  constructor(private readonly privilegedClient: SupabaseClient<Database>) {}

  async prepare(forwardPredictionId: string, accessLevel: ContentAccessLevel = "registered"): Promise<string> {
    if (!forwardPredictionId.trim()) throw new Error("A frozen forward prediction ID is required.");
    const { data, error } = await this.privilegedClient.rpc("prepare_consumer_prediction", {
      p_forward_prediction_id: forwardPredictionId,
      p_access_level: accessLevel,
    });
    if (error || !data) failure(error, "Consumer prediction preparation");
    return data;
  }

  async markReadyForReview(reportId: string) { return this.transition(reportId, "READY_FOR_REVIEW"); }
  async returnToDraft(reportId: string) { return this.transition(reportId, "NOT_PUBLISHED"); }
  async publish(reportId: string) { return this.transition(reportId, "PUBLISHED"); }
  async withdraw(reportId: string) { return this.transition(reportId, "WITHDRAWN"); }

  private async transition(reportId: string, target: ConsumerPublicationState): Promise<ConsumerPublicationState> {
    if (!reportId.trim()) throw new Error("A consumer report ID is required.");
    const { data, error } = await this.privilegedClient.rpc("transition_consumer_prediction", {
      p_report_id: reportId,
      p_target_state: target,
    });
    if (error || !data) failure(error, "Consumer prediction transition");
    if (data !== target) throw new Error("Consumer prediction transition returned an unexpected state.");
    return data as ConsumerPublicationState;
  }
}
