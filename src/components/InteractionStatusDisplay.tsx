'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserInteractionStatus } from '@/types/subscription';

interface InteractionStatusDisplayProps {
  interactionStatus: UserInteractionStatus | null;
  className?: string;
}

export function InteractionStatusDisplay({ 
  interactionStatus, 
  className = "" 
}: InteractionStatusDisplayProps) {
  const router = useRouter();
  
  if (!interactionStatus) {
    return null;
  }

  const { 
    canInteract, 
    remainingInteractions, 
    dailyLimit, 
    planType,
    planName,
    resetTime 
  } = interactionStatus;

  // Calcular porcentagem usada
  const usedInteractions = dailyLimit - remainingInteractions;
  const usagePercentage = dailyLimit > 0 ? (usedInteractions / dailyLimit) * 100 : 0;

  // Definir cores e ícones baseados no plano
  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'premium': return <Crown className="h-4 w-4" />;
      case 'enterprise': return <Zap className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Determinar se deve mostrar alerta
  const shouldShowAlert = !canInteract || remainingInteractions <= 5;
  const isLimitReached = !canInteract;

  const formatResetTime = (date: Date) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date?.toDateString() === tomorrow?.toDateString()) {
      return 'amanhã';
    }

    return date?.toLocaleDateString('pt-BR');
  };

  // Cores da barra de progresso
  const getProgressColor = () => {
    if (usagePercentage >= 100) return 'bg-red-500';
    if (usagePercentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-3 p-4 border rounded-lg bg-card ${className}`}>
      {/* Header com plano */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getPlanIcon(planType || 'free')}
          <span className="text-sm font-medium">
            {planName || `Plano ${planType === 'free' ? 'Gratuito' : 
                    planType === 'premium' ? 'Premium' : 
                    planType === 'enterprise' ? 'Enterprise' :
                    planType === 'basic' ? 'Básico' :
                    planType === 'pro' ? 'Pro' : 'Desconhecido'}`}
          </span>
        </div>
        
        {dailyLimit > 0 && (
          <span className="text-sm text-muted-foreground">
            {usedInteractions} / {dailyLimit}
          </span>
        )}
      </div>

      {/* Barra de progresso simples (apenas para planos com limite) */}
      {dailyLimit > 0 && (
        <div className="space-y-2">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {remainingInteractions} restantes
            </span>
            <span>
              Reset: {formatResetTime(resetTime)}
            </span>
          </div>
        </div>
      )}

      {/* Alertas */}
      {shouldShowAlert && (
        <div className={`p-3 rounded-md border flex items-start gap-2 ${
          isLimitReached ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
        }`}>
          <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
            isLimitReached ? 'text-red-600' : 'text-yellow-600'
          }`} />
          <div className={`text-sm ${
            isLimitReached ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {isLimitReached ? (
              <div className="space-y-1">
                <p className="font-medium">Limite diário atingido!</p>
                <p className="text-xs">
                  Você usou todas as {dailyLimit} interações disponíveis hoje.
                  Suas interações serão resetadas {formatResetTime(resetTime)}.
                </p>
                {planType === 'free' && (
                  <p className="text-xs">
                    Considere fazer upgrade para um plano premium para mais interações diárias.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">Poucas interações restantes!</p>
                <p className="text-xs">
                  Você tem apenas {remainingInteractions} interações disponíveis hoje.
                </p>
                {planType === 'free' && (
                  <p className="text-xs">
                    Considere fazer upgrade para um plano premium.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão de upgrade */}
      {(planType === 'free' || !planType) && (shouldShowAlert || usagePercentage >= 70) && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => {
            router.push('/plans');
          }}
        >
          <Crown className="h-4 w-4 mr-2" />
          Ver Planos Premium
        </Button>
      )}

      {/* Botão de gerenciar para planos pagos */}
      {(planType === 'basic' || planType === 'pro' || planType === 'premium' || planType === 'enterprise') && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => {
            router.push('/subscription/manage');
          }}
        >
          Gerenciar Assinatura
        </Button>
      )}
    </div>
  );
}

export default InteractionStatusDisplay;