import { supabase } from "@/lib/supabase";

/**
 * Returns a configured Supabase client for browser usage.
 * Throws an explicit error when the environment variables are missing.
 */
export function getSupabaseBrowserClient() {
  if (!supabase) {
    throw new Error(
      "Supabase não está configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return supabase;
}

export type SupabaseBrowserClient = ReturnType<typeof getSupabaseBrowserClient>;
