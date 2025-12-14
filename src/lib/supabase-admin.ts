import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

// ============================
// Criptografia para produção (AES-256-GCM) com fallback legacy
// ============================
const DATA_ENCRYPTION_KEY =
  process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || "";

function getAesKey(): Buffer {
  if (!DATA_ENCRYPTION_KEY) {
    throw new Error(
      "DATA_ENCRYPTION_KEY não configurada. Defina uma chave de 32 caracteres no ambiente.",
    );
  }
  // Deriva 32 bytes a partir da chave informada (aceita string)
  return crypto.createHash("sha256").update(DATA_ENCRYPTION_KEY).digest();
}

async function sha256Base16(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.webcrypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function encryptAesGcm(plaintext: string): string {
  const key = getAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato: v1:<iv>:<ciphertext>:<tag> em base64
  return [
    "v1",
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64"),
  ].join(":");
}

function decryptAesGcm(payload: string): string {
  const [version, ivB64, cipherB64, tagB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !cipherB64 || !tagB64) {
    throw new Error("Formato de criptografia inválido");
  }
  const key = getAesKey();
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// Criptografar dados sensíveis (produção)
export async function encryptSensitiveData(
  data: string,
): Promise<{ encrypted: string; hash: string }> {
  const hash = await sha256Base16(data);
  const encrypted = encryptAesGcm(data);
  return { encrypted, hash };
}

// Descriptografar dados sensíveis (produção)
export async function decryptSensitiveData(
  encrypted: string,
  expectedHash: string,
): Promise<string | null> {
  try {
    const decrypted = decryptAesGcm(encrypted);
    const hash = await sha256Base16(decrypted);
    if (hash === expectedHash) {
      return decrypted;
    }
    return null;
  } catch (error) {
    console.error("Erro ao descriptografar dados (AES-GCM):", error);
    return null;
  }
}
