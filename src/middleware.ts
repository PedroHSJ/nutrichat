import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";

// Rotas que precisam de autenticação
const protectedRoutes = ["/plans-manage", "/subscription", "/chat", "/consent"];

// Rotas de API que precisam de autenticação
const protectedApiRoutes = [
  "/api/subscription/checkout",
  "/api/subscription/status",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/login", "/register", "/forgot-password", "/"];
  const plansRoute = "/plans";
  // Permitir acesso livre às rotas públicas e à página de planos
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith(plansRoute)
  ) {
    return NextResponse.next();
  }

  // Buscar tokens de autenticação
  const authHeader = request.headers.get("authorization");
  const refreshToken = request.headers.get("x-refresh-token");
  let accessToken = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7);
  }

  // Se não autenticado, redireciona para login
  if (!accessToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Verifica status da assinatura via API interna
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const statusRes = await fetch(`${baseUrl}/api/subscription/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-refresh-token": refreshToken || "",
      },
    });
    if (!statusRes.ok) {
      console.log(
        "[middleware] Redirecionando para /login: status da assinatura não OK"
      );
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const status = await statusRes.json();
    // Loga status da assinatura
    console.log("[middleware] Status assinatura:", status);
    // Se usuário não tem plano, redireciona para /plans
    if (
      status.planType === "free" ||
      status.subscriptionStatus === "unpaid" ||
      status.planName === "Sem plano"
    ) {
      console.log(
        "[middleware] Redirecionando para /plans: usuário sem plano ativo"
      );
      const url = request.nextUrl.clone();
      url.pathname = "/plans";
      return NextResponse.redirect(url);
    }
    // Usuário autenticado e com plano: permite acesso normal
    console.log("[middleware] Usuário com plano ativo, acesso liberado");
    return NextResponse.next();
  } catch (err) {
    console.log(
      "[middleware] Erro ao verificar assinatura, redirecionando para /login",
      err
    );
    // Em caso de erro, redireciona para login por segurança
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    // Protege todas rotas dentro de (privates) e subpastas
    "/(privates)/:path*",
    // Protege APIs sensíveis
    "/api/subscription/:path*",
    "/api/agent-chat",
    // Mantém proteção genérica para outras rotas
    "/((?!_next/static|_next/image|favicon.ico|public|login|register|forgot-password|plans).*)",
  ],
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // // Redirecionar rota raiz para /login
  // if (request.nextUrl.pathname === "/") {
  //   console.log("Redirecting root to /login");
  //   const loginUrl = new URL("/login", request.url);
  //   return NextResponse.redirect(loginUrl);
  // }

  // Definir rotas públicas que não necessitam autenticação
  // const publicRoutes = ["/login", "/auth"];
  // const isPublicRoute = publicRoutes.some((route) =>
  //   request.nextUrl.pathname.startsWith(route)
  // );

  // // Se for uma rota pública, permitir acesso
  // if (isPublicRoute) {
  //   return supabaseResponse;
  // }

  // Para todas as outras rotas, verificar autenticação
  try {
    // No desenvolvimento, considerar sempre autenticado
    // if (process.env.NODE_ENV === "development") {
    //   console.log("Development mode: skipping authentication check");
    //   return supabaseResponse;
    // }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Se não houver usuário autenticado ou houver erro, redirecionar para login
    if (!user || error) {
      console.log("User not authenticated, redirecting to /login", {
        error: error?.message,
      });
      const loginUrl = new URL("/", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Se há usuário autenticado mas está tentando acessar /login, redirecionar para dashboard
    // if (user && request.nextUrl.pathname === "/login") {
    //   console.log(
    //     "Authenticated user accessing login, redirecting to dashboard"
    //   );
    //   const dashboardUrl = new URL("/dashboard", request.url);
    //   return NextResponse.redirect(dashboardUrl);
    // }

    return supabaseResponse;
  } catch (error) {
    console.error("Error checking authentication:", error);
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}
