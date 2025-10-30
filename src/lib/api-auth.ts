import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export interface AuthenticatedRequest {
  token: string;
  user: User;
}

export function extractBearerToken(request: NextRequest): string | null {
  const rawHeader =
    request.headers.get("authorization") ??
    request.headers.get("Authorization") ??
    "";

  if (rawHeader) {
    const [scheme, ...rest] = rawHeader.trim().split(/\s+/);
    if (scheme?.toLowerCase() === "bearer") {
      const token = rest.join(" ").trim();
      if (token) {
        return token;
      }
    }
  }

  const cookieToken =
    request.cookies.get("sb-access-token")?.value ??
    request.cookies.get("sb-token")?.value ??
    request.cookies.get("supabase-auth-token")?.value ??
    null;

  if (cookieToken) {
    try {
      const parsed = JSON.parse(cookieToken);
      if (Array.isArray(parsed) && parsed[0]) {
        return parsed[0];
      }
    } catch {
      return cookieToken;
    }
  }

  return null;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  const supabase = getSupabaseServerClient(request, token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { token, user };
}
