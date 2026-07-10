import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client. AAJ is a single-user app behind passcode
 * middleware; this key lives in a server env var and must never reach a
 * client component. All access goes through server components and server
 * actions. SUPABASE_KEY can be the secret (service-role) key, or the
 * publishable key while RLS is off — the secret key is the harder setup.
 */

let cached: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be configured.');
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
