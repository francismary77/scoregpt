"use server";
import { revalidatePath } from "next/cache";
import { requireServerUser } from "@/modules/account/server";
import { createServerPersistenceRepositories } from "@/modules/persistence/server";
import { entitlementConfig } from "@/config/application";

export async function unlockStoredReport(fixtureId: string) {
  const user = await requireServerUser(`/matches/${fixtureId}`), repositories = await createServerPersistenceRepositories();
  await repositories.predictionUsage.unlockPrediction(user.id, fixtureId, entitlementConfig.freePredictionAllowance);
  revalidatePath(`/matches/${fixtureId}`);
}
