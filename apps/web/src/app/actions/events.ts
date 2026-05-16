"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createEvent, updateEvent, deleteEvent } from "@kindred/db";
import { EventInputSchema, type EventInput } from "@kindred/shared";

export async function createEventAction(input: EventInput) {
  const session = await requireSession();
  const data = EventInputSchema.parse(input);

  const event = await createEvent({
    user_id: session.userId,
    person_id: data.person_id,
    type: data.type,
    title: data.title,
    date: data.date,
    recurring: data.recurring,
    notify_days_before: data.notify_days_before,
    notes: data.notes ?? null,
    plan_generated: null,
  });

  revalidatePath(`/dashboard/people/${data.person_id}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  return { ok: true as const, data: event };
}

export async function updateEventAction(eventId: string, personId: string, input: Partial<EventInput>) {
  const session = await requireSession();
  const data = EventInputSchema.partial().parse(input);

  const event = await updateEvent(session.userId, eventId, {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.date !== undefined && { date: data.date }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.recurring !== undefined && { recurring: data.recurring }),
    ...(data.notify_days_before !== undefined && { notify_days_before: data.notify_days_before }),
    ...(data.notes !== undefined && { notes: data.notes }),
  });

  revalidatePath(`/dashboard/people/${personId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  return { ok: true as const, data: event };
}

export async function deleteEventAction(eventId: string, personId: string) {
  const session = await requireSession();
  await deleteEvent(session.userId, eventId);
  revalidatePath(`/dashboard/people/${personId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
