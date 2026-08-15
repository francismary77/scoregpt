"use server";

import { revalidatePath } from "next/cache";
import { requireServerUser } from "@/modules/account/server";
import { createServerPersistenceRepositories } from "@/modules/persistence/server";

export async function unlockMemberPrediction(fixtureId: string) {
  const user = await requireServerUser("/pricing");
  const repositories = await createServerPersistenceRepositories();
  await repositories.predictionUsage.unlockPrediction(user.id, fixtureId);
  revalidatePath("/pricing");
  revalidatePath("/account");
  revalidatePath(`/matches/${fixtureId}`);
}
