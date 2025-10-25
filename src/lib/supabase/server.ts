import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedServerClient: SupabaseClient | null = null;

/**
 * Lazily creates a Supabase client for server-side usage.
 * Authentication cookies are not attached automatically; use it for
 * operations that do not depend on the current session.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (cachedServerClient) {
    return cachedServerClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase não está configurado no servidor. Verifique as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cachedServerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-application": "nutrichat-server",
      },
    },
  });

  return cachedServerClient;
}
