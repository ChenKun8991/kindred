import { getServiceClient } from "../client";
import type { Person } from "../types";

type PersonInsert = Omit<Person, "id" | "created_at" | "updated_at">;
type PersonUpdate = Partial<Omit<Person, "id" | "user_id" | "created_at" | "updated_at">>;

export type PeopleSort = "name" | "upcoming" | "last_contact";

export async function listPeople(
  userId: string,
  opts?: { q?: string; type?: Person["relationship_type"]; sort?: PeopleSort },
): Promise<Person[]> {
  const db = getServiceClient();
  let query = db.from("people").select().eq("user_id", userId);

  if (opts?.q) {
    query = query.or(`name.ilike.%${opts.q}%,nickname.ilike.%${opts.q}%`);
  }
  if (opts?.type) {
    query = query.eq("relationship_type", opts.type);
  }

  const sort = opts?.sort ?? "name";
  if (sort === "name") {
    query = query.order("name");
  } else if (sort === "last_contact") {
    query = query.order("last_contact_date", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Person[];
}

export async function getPersonById(userId: string, personId: string): Promise<Person | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("people")
    .select()
    .eq("id", personId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Person | null;
}

export async function createPerson(data: PersonInsert): Promise<Person> {
  const db = getServiceClient();
  const { data: row, error } = await db.from("people").insert(data).select().single();
  if (error) throw error;
  return row as Person;
}

export async function updatePerson(
  userId: string,
  personId: string,
  data: PersonUpdate,
): Promise<Person> {
  const db = getServiceClient();
  const { data: row, error } = await db
    .from("people")
    .update(data)
    .eq("id", personId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return row as Person;
}

export async function deletePerson(userId: string, personId: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from("people")
    .delete()
    .eq("id", personId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function countPeople(userId: string): Promise<number> {
  const db = getServiceClient();
  const { count, error } = await db
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}
