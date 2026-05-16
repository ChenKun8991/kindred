import { createHmac } from "crypto";
import type { TelegramAuthPayload } from "@kindred/shared";

const MAX_AUTH_AGE_SECONDS = 86400; // 24h

/**
 * Verifies a Telegram Login Widget payload.
 * Returns the payload when valid, throws on any failure.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramPayload(
  payload: TelegramAuthPayload,
): TelegramAuthPayload {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not configured");

  // 1. Check freshness
  const age = Math.floor(Date.now() / 1000) - payload.auth_date;
  if (age > MAX_AUTH_AGE_SECONDS) {
    throw new Error("Telegram auth payload is stale (older than 24h)");
  }

  // 2. Build the data-check string (all fields except hash, sorted alphabetically)
  const { hash, ...rest } = payload;
  const dataCheckString = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // 3. secret_key = SHA-256(bot_token)
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // 4. HMAC-SHA256 of data_check_string using secret_key
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (expectedHash !== hash) {
    throw new Error("Telegram auth hash mismatch");
  }

  return payload;
}
