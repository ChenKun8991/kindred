import { getServiceClient } from "../client";
import type { Event } from "../types";

type EventInsert = Omit<Event, "id" | "created_at">;
type EventUpdate = Partial<Omit<Event, "id" | "user_id" | "created_at">>;

/** Returns the next occurrence date of a recurring event from a given date. */
export function nextOccurrence(event: Event, from: Date = new Date()): Date {
  if (!event.recurring) return new Date(event.date);

  const base = new Date(event.date);
  const year = from.getFullYear();

  const thisYear = new Date(year, base.getMonth(), base.getDate());
  if (thisYear >= from) return thisYear;

  return new Date(year + 1, base.getMonth(), base.getDate());
}

export interface ResolvedEvent extends Event {
  next_occurrence: string;
}

export async function listEvents(
  userId: string,
  opts?: { from?: Date; to?: Date },
): Promise<ResolvedEvent[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("events")
    .select()
    .eq("user_id", userId)
    .order("date");
  if (error) throw error;

  const from = opts?.from ?? new Date();
  const to = opts?.to ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return ((data ?? []) as Event[])
    .map((e) => ({
      ...e,
      next_occurrence: nextOccurrence(e, from).toISOString().split("T")[0]!,
    }))
    .filter((e) => {
      const d = new Date(e.next_occurrence);
      return d >= from && d <= to;
    })
    .sort(
      (a, b) =>
        new Date(a.next_occurrence).getTime() -
        new Date(b.next_occurrence).getTime(),
    );
}

export async function getEventById(userId: string, eventId: string): Promise<Event | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("events")
    .select()
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Event | null;
}

export async function getBirthdayEvent(userId: string, personId: string): Promise<Event | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("events")
    .select()
    .eq("person_id", personId)
    .eq("user_id", userId)
    .eq("type", "birthday")
    .maybeSingle();
  if (error) throw error;
  return data as Event | null;
}

export async function createEvent(data: EventInsert): Promise<Event> {
  const db = getServiceClient();
  const { data: row, error } = await db.from("events").insert(data).select().single();
  if (error) throw error;
  return row as Event;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: EventUpdate,
): Promise<Event> {
  const db = getServiceClient();
  const { data: row, error } = await db
    .from("events")
    .update(data)
    .eq("id", eventId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return row as Event;
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);
  if (error) throw error;
}
