"use server";
import { revalidatePath } from "next/cache";
import { requireServerUser } from "@/modules/account/server";
import { createServerPersistenceRepositories } from "@/modules/persistence/server";

export async function unlockStoredReport(fixtureId: string) {
  const user = await requireServerUser(`/matches/${fixtureId}`), repositories = await createServerPersistenceRepositories();
  await repositories.predictionUsage.recordPredictionView(user.id, fixtureId);
  revalidatePath(`/matches/${fixtureId}`);
}
