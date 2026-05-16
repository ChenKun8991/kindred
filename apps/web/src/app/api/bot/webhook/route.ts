import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@kindred/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
  const update = await req.json();

  const message = update.message;
  if (!message?.text || !message.from) {
    return NextResponse.json({ ok: true });
  }

  const text: string = message.text.trim();
  const from = message.from;

  // Handle /start TOKEN
  if (text.startsWith("/start ")) {
    const token = text.slice(7).trim();

    const supabase = getServiceClient();

    const telegramData = {
      id: from.id,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      username: from.username ?? null,
      language_code: from.language_code ?? null,
    };

    const { data, error } = await supabase
      .from("login_tokens")
      .update({
        telegram_id: from.id,
        telegram_data: telegramData,
        verified_at: new Date().toISOString(),
      })
      .eq("token", token)
      .is("verified_at", null)
      .select()
      .maybeSingle();

    if (error || !data) {
      await sendMessage(from.id, "Sorry, that login link is invalid or expired. Please try again from the website.");
    } else {
      await sendMessage(from.id, `Welcome, ${from.first_name}! You are now logged in. Return to the website tab to continue.`);
    }
    return NextResponse.json({ ok: true });
  }

  if (text === "/start") {
    await sendMessage(from.id, "Hi! Open the Kindred website and click 'Log in with Telegram' to get started.");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
