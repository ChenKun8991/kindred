"use client";

import { Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function TelegramCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (params.hash) {
      signIn("telegram", { ...params, callbackUrl: "/dashboard" });
    } else {
      window.location.href = "/login";
    }
  }, [searchParams]);

  return <p className="text-muted-foreground">Signing you in…</p>;
}

export default function TelegramCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <TelegramCallback />
      </Suspense>
    </div>
  );
}
