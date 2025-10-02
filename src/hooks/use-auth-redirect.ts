import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

export function useAuthRedirect() {
  const router = useRouter();
  const { hasConsent} = useChat();
  const { isAuthenticated, authLoading } = useAuth();
  const { hasActivePlan, isTrialing, loading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    // Aguardar carregamento inicial
    if (authLoading || subscriptionLoading) return;

    console.log('[useAuthRedirect] Auth state:', { 
      isAuthenticated, 
      hasConsent, 
      hasActivePlan, 
      isTrialing 
    });

    // Se não está autenticado, ir para login
    if (!isAuthenticated) {
      console.log('[useAuthRedirect] Not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }

    // Se autenticado mas sem consentimento, ir para consent
    if (isAuthenticated && !hasConsent) {
      console.log('[useAuthRedirect] No consent, redirecting to consent');
      router.replace('/consent');
      return;
    }

    // Se tem consentimento mas não tem plano ativo, ir para plans
    if (isAuthenticated && hasConsent && !hasActivePlan && !isTrialing) {
      console.log('[useAuthRedirect] No active plan, redirecting to plans');
      router.replace('/plans');
      return;
    }

    // Se tem tudo, ir para chat
    if (isAuthenticated && hasConsent && (hasActivePlan || isTrialing)) {
      console.log('[useAuthRedirect] All good, redirecting to chat');
      router.replace('/chat');
      return;
    }
  }, [
    isAuthenticated, 
    hasConsent, 
    hasActivePlan, 
    isTrialing, 
    authLoading, 
    subscriptionLoading, 
    router
  ]);

  return {
    isLoading: authLoading || subscriptionLoading,
    shouldRedirect: isAuthenticated !== null // Só redirecionar quando soubermos o estado
  };
}