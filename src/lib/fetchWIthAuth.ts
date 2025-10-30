import { createBrowserClient } from "@supabase/ssr";
import { supabase } from "@/lib/supabase"; // Importa o cliente já configurado

/**
 * Faz uma requisição fetch incluindo o token JWT do usuário autenticado no header Authorization.
 * Reutilizável para rotas protegidas.
 * Inclui credentials: 'include' para enviar cookies de autenticação.
 */
export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
) {
  // Obtém o token do usuário logado
  const { data } = await supabase!.auth.getSession();
  console.log("Session Data:", data);
  const accessToken = data?.session?.access_token;
  console.log("Access Token:", accessToken);
  // Adiciona o header Authorization se houver token
  const headers = new Headers(init.headers || {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Garante que os cookies de autenticação sejam enviados
  const credentials = init.credentials ?? "include";

  return fetch(input, { ...init, headers, credentials });
}
