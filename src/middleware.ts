import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database";
import {} from "@supabase/ssr";
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
