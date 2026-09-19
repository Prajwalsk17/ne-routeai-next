import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

let _serviceClient: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client using the Service Role Key.
 * Bypasses RLS for system operations (telemetry, dispatching, automated alerting).
 * NEVER import this into Client Components or expose to the browser.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient;

  const env = getEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // If remote Supabase is not configured, gracefully fall back to local/in-memory adapters
    return null;
  }

  _serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
  });

  return _serviceClient;
}

export const isSupabaseConfigured = (): boolean => {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
};
