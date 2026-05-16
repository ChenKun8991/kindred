"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import {
  createPerson,
  updatePerson,
  deletePerson,
  countPeople,
  createEvent,
  getBirthdayEvent,
  updateEvent,
  deleteEvent,
} from "@kindred/db";
import { PersonInputSchema, type PersonInput } from "@kindred/shared";

async function reconcileBirthdayEvent(
  userId: string,
  personId: string,
  birthday: string | undefined,
  personName: string,
) {
  const existing = await getBirthdayEvent(userId, personId);

  if (birthday) {
    if (existing) {
      await updateEvent(userId, existing.id, { date: birthday, title: `${personName}'s Birthday` });
    } else {
      await createEvent({
        user_id: userId,
        person_id: personId,
        type: "birthday",
        title: `${personName}'s Birthday`,
        date: birthday,
        recurring: true,
        notify_days_before: [7, 3, 1],
        notes: null,
        plan_generated: null,
      });
    }
  } else if (!birthday && existing) {
    await deleteEvent(userId, existing.id);
  }
}

export async function createPersonAction(input: PersonInput) {
  const session = await requireSession();
  const userId = session.userId;

  const count = await countPeople(userId);
  if (count >= 10) {
    return { ok: false as const, error: { code: "LIMIT_PEOPLE" as const, message: "Free tier limit of 10 people reached." } };
  }

  const data = PersonInputSchema.parse(input);
  const person = await createPerson({
    user_id: userId,
    name: data.name,
    nickname: data.nickname ?? null,
    relationship_type: data.relationship_type,
    birthday: data.birthday ?? null,
    first_met_date: data.first_met_date ?? null,
    first_met_context: data.first_met_context ?? null,
    last_contact_date: null,
    location: data.location ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    instagram: data.instagram ?? null,
    hobbies: data.hobbies ?? [],
    food_preferences: data.food_preferences ?? null,
    love_language: data.love_language ?? null,
    occupation: data.occupation ?? null,
    personality_notes: data.personality_notes ?? null,
    gift_history: data.gift_history ?? [],
    notes: data.notes ?? null,
    photo_url: data.photo_url ?? null,
  });

  await reconcileBirthdayEvent(userId, person.id, data.birthday, data.name);

  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard");
  return { ok: true as const, data: person };
}

export async function updatePersonAction(personId: string, input: Partial<PersonInput>) {
  const session = await requireSession();
  const userId = session.userId;

  const data = PersonInputSchema.partial().parse(input);
  const person = await updatePerson(userId, personId, {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.nickname !== undefined && { nickname: data.nickname }),
    ...(data.relationship_type !== undefined && { relationship_type: data.relationship_type }),
    ...(data.birthday !== undefined && { birthday: data.birthday }),
    ...(data.first_met_date !== undefined && { first_met_date: data.first_met_date }),
    ...(data.first_met_context !== undefined && { first_met_context: data.first_met_context }),
    ...(data.location !== undefined && { location: data.location }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.instagram !== undefined && { instagram: data.instagram }),
    ...(data.hobbies !== undefined && { hobbies: data.hobbies }),
    ...(data.food_preferences !== undefined && { food_preferences: data.food_preferences }),
    ...(data.love_language !== undefined && { love_language: data.love_language }),
    ...(data.occupation !== undefined && { occupation: data.occupation }),
    ...(data.personality_notes !== undefined && { personality_notes: data.personality_notes }),
    ...(data.gift_history !== undefined && { gift_history: data.gift_history }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.photo_url !== undefined && { photo_url: data.photo_url }),
  });

  if (data.birthday !== undefined) {
    await reconcileBirthdayEvent(userId, personId, data.birthday, person.name);
  }

  revalidatePath(`/dashboard/people/${personId}`);
  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard");
  return { ok: true as const, data: person };
}

export async function deletePersonAction(personId: string) {
  const session = await requireSession();
  await deletePerson(session.userId, personId);
  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
