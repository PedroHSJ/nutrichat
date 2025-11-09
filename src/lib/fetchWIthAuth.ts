import supabase from "@/lib/supabase";

/**
 * Faz uma requisição fetch incluindo o token JWT do usuário autenticado no header Authorization.
 * Reutilizável para rotas protegidas. Inclui credentials: 'include' para enviar cookies.
 */
export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers || {});
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
}
