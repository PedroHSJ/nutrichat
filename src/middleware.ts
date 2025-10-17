import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

// Rotas que precisam de autenticação
const protectedRoutes = ['/plans', '/subscription', '/chat', '/consent'];

// Rotas de API que precisam de autenticação
const protectedApiRoutes = ['/api/subscription/checkout', '/api/subscription/status'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute || isProtectedApiRoute) {
    // Para rotas de página, verificar se tem sessão no cliente
    if (isProtectedRoute) {
      // Para rotas de página, deixar o componente verificar a autenticação
      return NextResponse.next();
    }
    
    // Para rotas de API, verificar o token no header
    if (isProtectedApiRoute) {
      const authorization = request.headers.get('authorization');
      
      if (!authorization?.startsWith('Bearer ') && !supabase) {
        return NextResponse.json(
          { success: false, error: 'Sistema de autenticação não configurado' },
          { status: 500 }
        );
      }
      
      if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'Token de autorização é obrigatório' },
          { status: 401 }
        );
      }
      
      // O token será validado na própria rota da API
      return NextResponse.next();
    }
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