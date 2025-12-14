import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUB_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ Persiste sessão no localStorage
    autoRefreshToken: true, // ✅ Renova token automaticamente
    detectSessionInUrl: true, // ✅ Detecta sessão na URL (útil para OAuth)
  },
});
// Função para definir sessão atual (para RLS)
export async function setCurrentSession(sessionId: string) {
  if (!supabase) {
    console.warn("Supabase não configurado - funcionando apenas em memória");
    return;
  }

  const { error } = await supabase.rpc("set_session_context", {
    session_id: sessionId,
  });

  if (error) {
    console.warn("Erro ao definir contexto de sessão:", error);
  }
}

// Função para gerar ID de sessão anônimo (legacy - não usado mais)
export function generateSessionId(): string {
  return `nutri_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Aviso: não use criptografia client-side para dados novos.
// Os helpers foram intencionalmente desabilitados para evitar gerar dados incompatíveis.
export async function encryptSensitiveData(): Promise<never> {
  throw new Error(
    "encryptSensitiveData (client) desabilitado. Use APIs server-side para persistir dados.",
  );
}

export function decryptSensitiveData(): never {
  throw new Error(
    "decryptSensitiveData (client) desabilitado. Use APIs server-side para ler dados.",
  );
}

export default supabase;
