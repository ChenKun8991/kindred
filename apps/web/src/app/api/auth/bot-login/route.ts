import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServiceClient } from "@kindred/db";

export async function POST() {
  const token = randomBytes(16).toString("hex");
  const supabase = getServiceClient();

  const { error } = await supabase.from("login_tokens").insert({ token });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const url = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ token, url });
}
