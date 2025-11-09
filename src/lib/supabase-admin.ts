import { createClient } from "@supabase/supabase-js";
import { Database } from "./database";

// Cliente normal com anon key (para usuários)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
        db: {
          schema: "public",
        },
        global: {
          headers: {
            "x-application": "nutrichat",
          },
        },
      })
    : null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY!;

export const supabaseAdmin = createClient(url, secret, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
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
  const data_encoded = encoder.encode(data);

  // Hash simples para verificação
  const hashBuffer = await crypto.subtle.digest("SHA-256", data_encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // "Criptografia" básica (apenas para demonstração - NÃO usar em produção)
  const encrypted = btoa(data);

  return { encrypted, hash };
}

// Função para descriptografar dados sensíveis
export async function decryptSensitiveData(
  encrypted: string,
  expectedHash: string,
): Promise<string | null> {
  try {
    const decrypted = atob(encrypted);
    const { hash } = await encryptSensitiveData(decrypted);

    if (hash === expectedHash) {
      return decrypted;
    }

    return null;
  } catch (error) {
    console.error("Erro ao descriptografar dados:", error);
    return null;
  }
}
