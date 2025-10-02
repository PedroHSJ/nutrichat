'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();

  useEffect(() => {
    console.log('[AuthCallback] Component mounted, checking auth state...');
    
    // Aguardar o carregamento inicial da autenticação
    if (authLoading) {
      console.log('[AuthCallback] Auth still loading, waiting...');
      return;
    }

    // Se não está autenticado, voltar para login
    if (!isAuthenticated) {
      console.log('[AuthCallback] Not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }

    // Se está autenticado, fazer uma navegação server-side para acionar o middleware
    console.log('[AuthCallback] Authenticated, triggering server navigation to activate middleware');
    
    // Pequeno delay para garantir que o estado foi totalmente sincronizado
    setTimeout(() => {
      console.log('[AuthCallback] Performing server-side navigation to /');
      // Usar window.location para forçar navegação server-side (aciona middleware)
      window.location.href = '/';
    }, 500);
    
  }, [isAuthenticated, authLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
        <p className="text-gray-600 mb-2">Configurando sua sessão...</p>
        <p className="text-sm text-gray-500">Redirecionando para a página apropriada</p>
      </div>
    </div>
  );
}