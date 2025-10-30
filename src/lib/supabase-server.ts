import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

/**
 * Creates a Supabase client for API/server routes.
 * Automatically reads cookies from the incoming request.
 */
export function getSupabaseServerClient(
  request?: NextRequest,
  accessToken?: string
) {
  const authorizationHeader =
    accessToken && accessToken.length > 0
      ? `Bearer ${accessToken}`
      : request
      ? request.headers.get("authorization") ??
        request.headers.get("Authorization") ??
        ""
      : "";

  const headers: Record<string, string> = {
    "x-application": "nutrichat-server",
  };

  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (request) {
            return request.cookies.getAll();
          }
          return [];
        },
        setAll() {
          // Cookies are not set in API routes
        },
      },
      global: {
        headers,
      },
    }
  );
}
