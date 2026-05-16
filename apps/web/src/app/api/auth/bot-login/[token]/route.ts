import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@kindred/db";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("login_tokens")
    .select("token, telegram_id, telegram_data, verified_at, expires_at")
    .eq("token", params.token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ verified: false }, { status: 404 });

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ verified: false, expired: true });
  }

  if (!data.verified_at) {
    return NextResponse.json({ verified: false });
  }

  return NextResponse.json({
    verified: true,
    telegram_id: data.telegram_id,
    telegram_data: data.telegram_data,
  });
}
