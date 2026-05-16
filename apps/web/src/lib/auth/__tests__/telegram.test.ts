/// <reference types="vitest/globals" />
import { createHmac } from "crypto";
import { verifyTelegramPayload } from "../telegram";

const BOT_TOKEN = "test_bot_token_12345";

function buildPayload(overrides?: Partial<{
  id: number;
  first_name: string;
  username: string;
  auth_date: number;
}>) {
  const now = Math.floor(Date.now() / 1000);
  const base = {
    id: 123456789,
    first_name: "Alice",
    username: "alice",
    auth_date: now,
    ...overrides,
  };

  const dataCheckString = Object.entries(base)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return { ...base, hash };
}

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
});

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe("verifyTelegramPayload", () => {
  it("accepts a valid payload", () => {
    const payload = buildPayload();
    expect(() => verifyTelegramPayload(payload)).not.toThrow();
  });

  it("rejects a tampered hash", () => {
    const payload = { ...buildPayload(), hash: "000000" };
    expect(() => verifyTelegramPayload(payload)).toThrow("hash mismatch");
  });

  it("rejects a stale auth_date (>24h)", () => {
    const staleDate = Math.floor(Date.now() / 1000) - 86401;
    const payload = buildPayload({ auth_date: staleDate });
    expect(() => verifyTelegramPayload(payload)).toThrow("stale");
  });
});
