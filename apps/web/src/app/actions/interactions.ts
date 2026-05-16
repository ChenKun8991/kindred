"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createInteraction } from "@kindred/db";
import { InteractionInputSchema, type InteractionInput } from "@kindred/shared";

export async function createInteractionAction(input: InteractionInput) {
  const session = await requireSession();
  const data = InteractionInputSchema.parse(input);

  const interaction = await createInteraction({
    user_id: session.userId,
    person_id: data.person_id,
    date: data.date ?? new Date().toISOString().split("T")[0]!,
    channel: data.channel,
    notes: data.notes ?? null,
  });

  revalidatePath(`/dashboard/people/${data.person_id}`);
  revalidatePath("/dashboard");
  return { ok: true as const, data: interaction };
}
