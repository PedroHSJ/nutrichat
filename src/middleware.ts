import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Rotas que precisam de autenticação
const protectedRoutes = ["/plans", "/subscription", "/chat", "/consent"];

// Rotas de API que precisam de autenticação
const protectedApiRoutes = [
  "/api/subscription/checkout",
  "/api/subscription/status",
];

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
