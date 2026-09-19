import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _browserClient: SupabaseClient | null = null;

/**
 * Returns a browser-safe Supabase client using the public anon key.
 * Safe to import in React Client Components and hooks.
 * Governed strictly by PostgreSQL Row Level Security (RLS) policies.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (_browserClient) return _browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    // Unconfigured in dev/mock mode
    return null;
  }

  _browserClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return _browserClient;
}
