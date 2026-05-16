"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

type Status = "idle" | "waiting" | "verified" | "error";

export function TelegramLoginButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  async function startLogin() {
    setStatus("waiting");
    setErrorMsg(null);
    const res = await fetch("/api/auth/bot-login", { method: "POST" });
    if (!res.ok) {
      setStatus("error");
      setErrorMsg("Could not create login link. Try again.");
      return;
    }
    const data = await res.json();
    setBotUrl(data.url);
    setToken(data.token);

    // open the bot link in a new tab
    window.open(data.url, "_blank");
  }

  useEffect(() => {
    if (!token || status !== "waiting") return;

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/auth/bot-login/${token}`);
      const data = await res.json();

      if (data.verified) {
        clearInterval(pollRef.current!);
        setStatus("verified");
        await signIn("telegram", { token, callbackUrl: "/dashboard" });
      } else if (data.expired) {
        clearInterval(pollRef.current!);
        setStatus("error");
        setErrorMsg("Login link expired. Please try again.");
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, status]);

  if (status === "idle") {
    return (
      <button
        onClick={startLogin}
        className="inline-flex items-center gap-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-medium px-6 py-3 rounded-lg transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
        </svg>
        Log in with Telegram
      </button>
    );
  }

  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="animate-pulse text-muted-foreground">
          Waiting for you to confirm in Telegram…
        </div>
        {botUrl && (
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Open Telegram bot
          </a>
        )}
        <p className="text-xs text-muted-foreground">
          Tap the button above, then press <strong>START</strong> in Telegram.
          This page will refresh automatically.
        </p>
      </div>
    );
  }

  if (status === "verified") {
    return <p className="text-green-600">Logged in! Redirecting…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-destructive text-sm">{errorMsg}</p>
      <button onClick={startLogin} className="text-sm underline">
        Try again
      </button>
    </div>
  );
}
