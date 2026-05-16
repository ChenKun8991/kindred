import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Using untyped client; query files apply explicit return types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

let _anon: AnyClient | null = null;
let _service: AnyClient | null = null;

/** Browser-safe anon client (respects RLS). */
export function getAnonClient(): AnyClient {
  if (_anon) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase anon env vars missing");
  _anon = createClient(url, key);
  return _anon;
}

/** Service-role client — server-only; bypasses RLS. Always scope queries by user_id in code. */
export function getServiceClient(): AnyClient {
  if (_service) return _service;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service-role env vars missing");
  _service = createClient(url, key, {
    auth: { persistSession: false },
  });
  return _service;
}

/**
 * Returns an anon client with the RLS session variable set so
 * policies evaluate for the given userId. Use this in server actions.
 */
export async function getScopedClient(userId: string): Promise<AnyClient> {
  const client = getAnonClient();
  await client.rpc("set_config", { setting: "app.current_user_id", value: userId });
  return client;
}
