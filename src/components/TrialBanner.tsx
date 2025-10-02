'use client';
import React from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/context/SubscriptionContext';

export const TrialBanner: React.FC = () => {
  const { isTrialing, trialDaysRemaining, trialEndsAt } = useSubscription();
  const router = useRouter();

  if (!isTrialing) return null;

  return (
    <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow">
      <div className="flex items-start md:items-center gap-3">
        <div className="mt-0.5"><Clock className="h-5 w-5" /></div>
        <div className="text-sm">
          <strong className="font-semibold">Período de Teste Ativo</strong><br />
          {trialDaysRemaining !== undefined && trialDaysRemaining > 0 ? (
            <>Faltam <span className="font-semibold">{trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}</span> para o fim do seu trial (até {trialEndsAt?.toLocaleDateString('pt-BR')}).</>
          ) : (
            <>Seu trial termina hoje ({trialEndsAt?.toLocaleDateString('pt-BR')}).</>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => router.push('/plans')}>
          Fazer Upgrade
        </Button>
      </div>
    </div>
  );
};
