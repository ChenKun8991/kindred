import { getServiceClient } from "../client";
import type { User } from "../types";

export async function upsertUser(
  data: Pick<User, "telegram_id" | "telegram_username" | "first_name" | "photo_url">,
): Promise<User> {
  const db = getServiceClient();
  const { data: row, error } = await db
    .from("users")
    .upsert({ ...data, last_seen_at: new Date().toISOString() }, { onConflict: "telegram_id" })
    .select()
    .single();
  if (error) throw error;
  return row as User;
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("users")
    .select()
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (error) throw error;
  return data as User | null;
}

export async function updateUserTimezone(userId: string, timezone: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from("users").update({ timezone }).eq("id", userId);
  if (error) throw error;
}

export async function deleteUser(userId: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from("users").delete().eq("id", userId);
  if (error) throw error;
}
