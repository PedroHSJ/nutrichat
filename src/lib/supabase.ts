import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database";

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

// Função para criptografar dados sensíveis
export async function encryptSensitiveData(
  data: string,
): Promise<{ encrypted: string; hash: string }> {
  // Em produção, use uma chave de criptografia mais robusta
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Gerar hash para busca (não reversível)
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Para simplicidade, usamos base64. Em produção, use crypto.subtle com chave secreta
  const encrypted = btoa(data);

  return { encrypted, hash };
}

// Função para descriptografar dados
export function decryptSensitiveData(encryptedData: string): string {
  try {
    return atob(encryptedData);
  } catch (error) {
    console.error("Erro ao descriptografar dados:", error);
    return "[Dados não disponíveis]";
  }
}

export default supabase;
