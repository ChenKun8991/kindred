"use client";

export function TelegramLoginButton() {
  const botId = "8674655386";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://web-seven-zeta-22.vercel.app";
  const returnTo = `${origin}/api/auth/telegram/callback`;

  const href = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(origin)}&embed=0&request_access=write&return_to=${encodeURIComponent(returnTo)}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-medium px-6 py-3 rounded-lg transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
      </svg>
      Log in with Telegram
    </a>
  );
}
