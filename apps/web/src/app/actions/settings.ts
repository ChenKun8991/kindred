"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { updateUserTimezone, deleteUser } from "@kindred/db";

export async function updateTimezoneAction(timezone: string) {
  const session = await requireSession();
  await updateUserTimezone(session.userId, timezone);
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

export async function deleteAccountAction() {
  const session = await requireSession();
  await deleteUser(session.userId);
  return { ok: true as const };
}
