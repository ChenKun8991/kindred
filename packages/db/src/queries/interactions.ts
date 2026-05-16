import { getServiceClient } from "../client";
import type { Interaction } from "../types";

type InteractionInsert = Omit<Interaction, "id" | "created_at">;

export async function listInteractions(userId: string, personId: string): Promise<Interaction[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("interactions")
    .select()
    .eq("user_id", userId)
    .eq("person_id", personId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Interaction[];
}

export async function createInteraction(data: InteractionInsert): Promise<Interaction> {
  const db = getServiceClient();
  const { data: row, error } = await db.from("interactions").insert(data).select().single();
  if (error) throw error;
  return row as Interaction;
}
