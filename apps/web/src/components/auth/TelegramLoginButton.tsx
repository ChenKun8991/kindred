"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !containerRef.current) return;

    // The Telegram widget calls window.onTelegramAuth when the user authorizes
    (window as unknown as Record<string, unknown>)["onTelegramAuth"] = (
      user: Record<string, unknown>,
    ) => {
      signIn("telegram", { ...user, callbackUrl: "/dashboard" });
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    containerRef.current.appendChild(script);
  }, []);

  return <div ref={containerRef} />;
}
