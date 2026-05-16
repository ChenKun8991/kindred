import { getServiceClient } from "../client";
import type { Subscription } from "../types";

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("subscriptions")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Subscription | null;
}

export async function createFreeSubscription(userId: string): Promise<Subscription> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("subscriptions")
    .insert({ user_id: userId, tier: "free" })
    .select()
    .single();
  if (error) throw error;
  return data as Subscription;
}

export async function updateSubscription(
  userId: string,
  data: Partial<Omit<Subscription, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<Subscription> {
  const db = getServiceClient();
  const { data: row, error } = await db
    .from("subscriptions")
    .update(data)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return row as Subscription;
}
