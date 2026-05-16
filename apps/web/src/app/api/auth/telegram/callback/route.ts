import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Pass all Telegram params to a client page that calls signIn()
  const page = new URL("/auth/telegram", origin);
  searchParams.forEach((value, key) => {
    page.searchParams.set(key, value);
  });

  return NextResponse.redirect(page);
}
