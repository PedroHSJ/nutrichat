'use client';

import { useState, useEffect } from 'react';
import { UserSubscriptionService } from '@/lib/subscription';
import { UserInteractionStatus } from '@/types/subscription';
import { useChat } from '@/context/ChatContext';

export function useSubscription() {
  const { user, isAuthenticated } = useChat();
  const [subscriptionStatus, setSubscriptionStatus] = useState<UserInteractionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || !user) {
        setSubscriptionStatus(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const status = await UserSubscriptionService.canUserInteract(user.id);
        setSubscriptionStatus(status);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar assinatura';
        setError(errorMessage);
        console.error('Erro ao verificar status da assinatura:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, isAuthenticated]);

  const refreshSubscription = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const status = await UserSubscriptionService.canUserInteract(user.id);
      setSubscriptionStatus(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar assinatura';
      setError(errorMessage);
      console.error('Erro ao atualizar status da assinatura:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    subscriptionStatus,
    loading,
    error,
    refreshSubscription,
    hasActivePlan: subscriptionStatus?.canInteract && subscriptionStatus.planType !== 'free',
    isFreePlan: subscriptionStatus?.planType === 'free',
    remainingInteractions: subscriptionStatus?.remainingInteractions || 0,
    dailyLimit: subscriptionStatus?.dailyLimit || 0,
    planName: subscriptionStatus?.planName || 'Sem plano'
  };
}