import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rotas que precisam de autenticação
const protectedRoutes = ['/plans', '/subscription', '/chat', '/consent'];

// Rotas de API que precisam de autenticação
const protectedApiRoutes = ['/api/subscription/checkout', '/api/subscription/status'];

// Rotas públicas que não precisam de redirecionamento
const publicRoutes = ['/login', '/signup', '/debug', '/auth/callback', '/api', '/_next', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Pular rotas públicas, assets e API não protegidas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  try {
    // Criar cliente Supabase para middleware
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.next();
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar sessão via cookies - procurar por diferentes formatos de cookie
    const cookieNames = ['sb-auth-token', 'supabase-auth-token', 'sb-localhost-auth-token'];
    let authCookie = null;
    
    for (const cookieName of cookieNames) {
      const cookie = request.cookies.get(cookieName);
      if (cookie?.value) {
        authCookie = cookie.value;
        break;
      }
    }
    
    // Também verificar cookies que começam com 'sb-'
    if (!authCookie) {
      for (const [name, cookie] of request.cookies) {
        if (name.startsWith('sb-') && cookie.value) {
          authCookie = cookie.value;
          break;
        }
      }
    }
    
    console.log('Middleware - Auth cookie found:', !!authCookie);
    
    // Se não há cookie de auth e está tentando acessar rota protegida
    if (!authCookie && (protectedRoutes.some(route => pathname.startsWith(route)) || pathname === '/')) {
      console.log('Middleware - No auth cookie, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Se tem cookie de auth, verificar estado para rota raiz
    if (authCookie && pathname === '/') {
      console.log('Middleware - Processing root path with auth');
      try {
        // Extrair o access_token do cookie (formato básico)
        let accessToken = null;
        try {
          const cookieData = JSON.parse(authCookie);
          accessToken = cookieData?.access_token;
        } catch {
          // Se não conseguir parsear, pode ser que seja um token direto
          accessToken = authCookie;
        }
        
        console.log('Middleware - Access token found:', !!accessToken);
        
        if (accessToken) {
          // Verificar consent via API direta
          console.log('Middleware - Checking consent');
          const consentResponse = await fetch(new URL('/api/user/consent', request.url), {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          let hasConsent = false;
          if (consentResponse.ok) {
            const consentData = await consentResponse.json();
            hasConsent = consentData.hasConsent || false;
          }
          
          console.log('Middleware - Has consent:', hasConsent);
          
          if (!hasConsent) {
            console.log('Middleware - Redirecting to consent');
            const consentUrl = new URL('/consent', request.url);
            return NextResponse.redirect(consentUrl);
          }
          
          // Verificar subscription
          console.log('Middleware - Checking subscription');
          const subscriptionResponse = await fetch(new URL('/api/subscription/status', request.url), {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (subscriptionResponse.ok) {
            const subData = await subscriptionResponse.json();
            const hasActivePlan = subData.canInteract && ['active', 'trialing'].includes(subData.subscriptionStatus);
            
            console.log('Middleware - Has active plan:', hasActivePlan);
            
            if (!hasActivePlan) {
              console.log('Middleware - Redirecting to plans');
              const plansUrl = new URL('/plans', request.url);
              return NextResponse.redirect(plansUrl);
            }
            
            // Se tem tudo, vai para chat
            console.log('Middleware - Redirecting to chat');
            const chatUrl = new URL('/chat', request.url);
            return NextResponse.redirect(chatUrl);
          }
        }
      } catch (e) {
        console.error('Error in middleware auth check:', e);
        // Em caso de erro, deixar o componente lidar
        return NextResponse.next();
      }
    }
    
    // Para rotas de API protegidas, verificar header
    if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
      const authorization = request.headers.get('authorization');
      
      if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'Token de autorização é obrigatório' },
          { status: 401 }
        );
      }
    }
    
  } catch (error) {
    console.error('Middleware error:', error);
    // Em caso de erro, deixar o componente lidar
    return NextResponse.next();
  }
  
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
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};